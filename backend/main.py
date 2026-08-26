import os
import re
from typing import Any
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    CouldNotRetrieveTranscript,
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
)
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=False)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"), override=False)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY is not configured.")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
ACCESS_CODE = os.getenv("ACCESS_CODE", "205442")

allowed_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app = FastAPI(title="YouTube Transcript RAG API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=GOOGLE_API_KEY,
)
llm = ChatGoogleGenerativeAI(
    model=GEMINI_MODEL,
    temperature=0.2,
    google_api_key=GOOGLE_API_KEY,
)

PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are a grounded YouTube transcript assistant.
Answer using ONLY the retrieved transcript context.
Do not invent facts. If the context is insufficient, say that the transcript does not contain enough information.
Distinguish what the speaker says from reasonable interpretation. Keep the answer concise.
Mention the source video when useful.

Retrieved context:
{context}""",
        ),
        ("human", "Question: {question}"),
    ]
)
rag_chain = PROMPT | llm | StrOutputParser()

sessions: dict[str, dict[str, Any]] = {}


class IngestRequest(BaseModel):
    video_url: str | None = None
    transcript_text: str | None = None
    transcript_title: str | None = None
    transcript_source: str | None = None
    access_code: str | None = None


class AskRequest(BaseModel):
    session_id: str = Field(min_length=1)
    question: str = Field(min_length=1)
    top_k: int = Field(default=4, ge=1, le=10)
    access_code: str | None = None


def validate_access_code(code: str | None) -> None:
    if ACCESS_CODE and code != ACCESS_CODE:
        raise HTTPException(status_code=403, detail="Invalid access code.")


def extract_video_id(video_url: str) -> str:
    parsed = urlparse(video_url.strip())
    hostname = parsed.netloc.lower().split(":")[0]
    video_id = ""

    if hostname in {"youtu.be", "www.youtu.be"}:
        video_id = parsed.path.lstrip("/").split("/")[0]
    elif hostname in {"youtube.com", "www.youtube.com", "m.youtube.com"}:
        if parsed.path == "/watch":
            video_id = parse_qs(parsed.query).get("v", [""])[0]
        elif parsed.path.startswith(("/embed/", "/shorts/", "/live/")):
            parts = parsed.path.split("/")
            video_id = parts[2] if len(parts) > 2 else ""

    if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
        raise ValueError("Could not extract a valid YouTube video ID.")
    return video_id


def fetch_transcript(video_url: str) -> dict[str, str]:
    video_id = extract_video_id(video_url)
    api = YouTubeTranscriptApi()
    transcript_list = api.list(video_id)

    language_codes = ["en", "en-US", "en-GB", "en-AU"]
    transcript = None

    for lang in language_codes:
        try:
            transcript = transcript_list.find_manually_created_transcript([lang])
            break
        except NoTranscriptFound:
            continue

    if transcript is None:
        for lang in language_codes:
            try:
                transcript = transcript_list.find_generated_transcript([lang])
                break
            except NoTranscriptFound:
                continue

    if transcript is None:
        raise RuntimeError("No transcript could be retrieved for this video.")

    fetched = transcript.fetch()
    text = re.sub(
        r"\s+",
        " ",
        " ".join(
            segment.text.strip()
            for segment in fetched
            if getattr(segment, "text", "").strip()
        ),
    ).strip()

    if not text:
        raise RuntimeError("No transcript could be retrieved for this video.")

    return {
        "video_id": video_id,
        "source": f"https://www.youtube.com/watch?v={video_id}",
        "title": f"YouTube video ({video_id})",
        "transcript": text,
    }


def normalize_transcript_text(raw_text: str) -> str:
    lines = raw_text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    cleaned_lines: list[str] = []
    timestamp_pattern = re.compile(
        r"^\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}$"
    )

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.isdigit():
            continue
        if timestamp_pattern.match(stripped):
            continue
        cleaned_lines.append(stripped)

    return re.sub(r"\s+", " ", " ".join(cleaned_lines)).strip()


def build_manual_transcript(request: IngestRequest) -> dict[str, str] | None:
    if not request.transcript_text or not request.transcript_text.strip():
        return None

    normalized_text = normalize_transcript_text(request.transcript_text)
    if not normalized_text:
        raise ValueError("Transcript text is empty after cleanup.")

    source = (request.transcript_source or "Manual transcript upload").strip()
    title = (request.transcript_title or "Manual transcript").strip()
    video_id = "manual"

    if request.video_url and request.video_url.strip():
        try:
            video_id = extract_video_id(request.video_url)
            source = request.video_url.strip()
            if not request.transcript_title:
                title = f"Manual transcript for video ({video_id})"
        except ValueError:
            # Keep manual transcript usable even when the URL is malformed.
            pass

    return {
        "video_id": video_id,
        "source": source,
        "title": title,
        "transcript": normalized_text,
    }


def create_chunks(transcript: dict[str, str]) -> list[Document]:
    document = Document(
        page_content=transcript["transcript"],
        metadata={
            "video_id": transcript["video_id"],
            "source": transcript["source"],
            "title": transcript["title"],
        },
    )
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_documents([document])


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "YouTube Transcript RAG API is running", "health": "/health"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ingest")
def ingest(request: IngestRequest) -> dict[str, Any]:
    manual_transcript: dict[str, str] | None = None
    try:
        validate_access_code(request.access_code)
        manual_transcript = build_manual_transcript(request)

        if request.video_url and request.video_url.strip():
            try:
                transcript = fetch_transcript(request.video_url.strip())
            except (
                TranscriptsDisabled,
                NoTranscriptFound,
                CouldNotRetrieveTranscript,
                VideoUnavailable,
                RuntimeError,
            ) as transcript_error:
                if manual_transcript is None:
                    raise HTTPException(
                        status_code=422,
                        detail={
                            "code": "transcript_unavailable",
                            "message": "No transcript could be retrieved for this video.",
                            "hint": "Paste transcript text or upload a .txt/.srt transcript to continue.",
                            "provider_error": type(transcript_error).__name__,
                        },
                    ) from transcript_error
                transcript = manual_transcript
        elif manual_transcript is not None:
            transcript = manual_transcript
        else:
            raise ValueError(
                "Provide a YouTube URL or transcript text to start ingestion."
            )

        chunks = create_chunks(transcript)
        vectorstore = FAISS.from_documents(chunks, embeddings)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=502, detail=f"Transcript service error: {error}"
        ) from error

    session_id = str(uuid4())
    sessions[session_id] = {
        "vectorstore": vectorstore,
        "metadata": transcript,
        "chunks": chunks,
    }
    return {
        "session_id": session_id,
        "video_id": transcript["video_id"],
        "title": transcript["title"],
        "source": transcript["source"],
        "chunk_count": len(chunks),
    }


@app.post("/ask")
def ask(request: AskRequest) -> dict[str, Any]:
    try:
        validate_access_code(request.access_code)
    except HTTPException:
        raise

    session = sessions.get(request.session_id)
    if not session:
        raise HTTPException(
            status_code=404, detail="Session not found. Ingest a video first."
        )

    scored_documents = session["vectorstore"].similarity_search_with_score(
        request.question,
        k=request.top_k,
    )
    context = "\n\n".join(
        f"[Chunk {index} | {document.metadata['title']}]\n{document.page_content}"
        for index, (document, _) in enumerate(scored_documents, start=1)
    )
    try:
        answer = rag_chain.invoke({"question": request.question, "context": context})
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini generation failed using {GEMINI_MODEL}: {error}",
        ) from error

    return {
        "question": request.question,
        "answer": answer,
        "source": session["metadata"],
        "retrieved_chunks": [
            {
                "text": document.page_content,
                "score": float(score),
                "metadata": document.metadata,
            }
            for document, score in scored_documents
        ],
    }
