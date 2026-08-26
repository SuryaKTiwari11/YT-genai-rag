# YouTube Transcript RAG End-to-End Logic

This file explains the complete flow of your notebook from dependency setup to final answer generation.

## 1) Purpose

The notebook builds a YouTube Transcript RAG system that:

1. Accepts a YouTube video URL.
2. Retrieves and cleans its transcript.
3. Converts transcript text into vector-searchable document chunks.
4. Uses retrieval + Gemini generation to answer user questions.

## 2) High-Level Data Flow

User input (YouTube URL + question)
-> transcript retrieval
-> document construction and cleaning
-> chunking
-> embeddings
-> FAISS vector index
-> relevant chunk retrieval
-> Gemini response generation

## 3) Notebook Section-by-Section Logic

## 3.1 Setup and dependencies

The notebook installs/imports:

- Transcript provider: youtube-transcript-api
- Env loading: python-dotenv
- RAG stack: langchain + FAISS + Google GenAI integrations

Environment variables are loaded from .env, then API keys are validated.

The only expected key is:

- GOOGLE_API_KEY

If GOOGLE_API_KEY is missing, execution stops with ValueError.

## 3.2 YouTube transcript ingestion

`extract_video_id()` validates common YouTube URL formats. `get_youtube_transcript()` retrieves captions, joins the segments, and returns transcript text plus video metadata.

## 3.3 Transcript document creation

`create_documents()` creates metadata-rich LangChain `Document` chunks from the cleaned transcript.
Each document stores the transcript in `page_content` and the video ID, source URL, and fallback title in `metadata`. `RecursiveCharacterTextSplitter` splits long documents into chunks with:

- chunk_size = 1000
- chunk_overlap = 200

Result: split_docs ready for embedding and indexing.

## 3.5 RAG assembly: build_vectorstore() and build_rag_chain()

Given split documents:

1. Build embeddings with GoogleGenerativeAIEmbeddings.
2. Create FAISS vector store from documents.
3. Create chat model (ChatGoogleGenerativeAI, gemini-2.5-flash).
4. Define chat prompt template:
   - System role: grounded transcript assistant behavior
   - Human message: inject retrieved context + user question
5. Build chain pipeline:
   - retriever provides context
   - prompt formats input
   - llm generates output
   - StrOutputParser returns plain text

The chain and vector store are returned for later queries.

## 3.6 Question answering: ask_question(question)

1. Ensures the vector store and RAG chain exist.
2. Retrieves the top-k chunks with FAISS distance scores.
3. Displays retrieved evidence and source URLs.
4. Calls the grounded Gemini chain with the retrieved context.
5. Returns the final generated answer string.

If rag_chain is not built yet, it returns an instruction string to build first.

## 3.7 User input and run cells

The interactive input cell asks for:

- VIDEO_URL
- QUESTION

Final run cell executes full pipeline in order:

1. transcript_result = get_youtube_transcript(VIDEO_URL)
2. chunks = create_documents(transcript_result)
3. vectorstore = build_vectorstore(chunks)
4. rag_chain, retriever = build_rag_chain(vectorstore, k=4)
5. response = ask_question(QUESTION, vectorstore, rag_chain, k=4)
6. The answer, retrieved context, scores, and source URL are printed.

## 4) What retrieval adds in this project

Without retrieval, the model answers from general training only.
With retrieval, responses are grounded in fetched transcript content indexed in FAISS.
That improves relevance and reduces unsupported claims.

## 5) Error handling behavior

Transcript retrieval returns clear error messages for invalid URLs, unavailable videos, disabled captions, and empty transcripts.

The notebook catches expected transcript errors and returns a readable message instead of crashing the complete workflow.

## 6) Practical run order (important)

To run successfully, execute cells in this order:

1. Install dependencies
2. Imports + load_dotenv
3. Key verification
4. Transcript ingestion function cells
5. Document and chunking cells
6. FAISS and RAG chain cells
7. User input cell
8. Final run cell

If you rerun after editing methods, rerun the definition cells before the final run cell so runtime picks up latest code.

## 7) Summary in one line

Your notebook is a pipeline that converts a YouTube URL into transcript chunks, indexes them semantically, retrieves relevant evidence for a user question, and generates a grounded natural-language answer with Gemini.
