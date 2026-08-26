# YouTube Transcript RAG System

An interview-friendly RAG system using LangChain, YouTube transcripts, Google Gemini, Google embeddings, and FAISS.

## What it does

1. **Accepts a YouTube URL**
2. **Retrieves the video's transcript** without downloading the video
3. **Cleans and chunks** the transcript into LangChain documents
4. **Creates embeddings** with Google Generative AI
5. **Stores chunks in FAISS** for semantic retrieval
6. **Answers questions** using Gemini and the retrieved transcript context

## Quick Start

### Install

```bash
pip install youtube-transcript-api python-dotenv langchain langchain-community langchain-google-genai langchain-text-splitters faiss-cpu
```

### Setup

Create `.env` file:

```env
GOOGLE_API_KEY=your_google_key
GEMINI_MODEL=gemini-3.6-flash
```

### Use

Open `calude_chatbox.ipynb`, run the installation and setup cells, then enter a YouTube URL and question in the interactive section.

## How RAG works here

- **Data**: YouTube transcript text
- **Documents**: Metadata-rich LangChain `Document` chunks
- **Chunking**: Split text into smaller pieces
- **Embeddings**: Convert text to vectors
- **Storage**: FAISS vector database
- **Retrieval**: Find relevant chunks for questions
- **Generation**: LLM creates answers from context

That's it!

## Web App

The repository also includes a FastAPI backend and React + Tailwind frontend.

### Backend

Create `backend/.env` from `backend/.env.example`, or keep the root `.env` available when running from the repository root:

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

The API provides:

- `GET /health` - health check
- `POST /ingest` - retrieve a transcript and build a FAISS session index
- `POST /ask` - retrieve evidence and generate a grounded Gemini answer

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

The frontend runs at `http://localhost:5173` and calls the backend at `http://localhost:8000`.

The Google API key stays on the backend. Set `CORS_ORIGINS` on the backend to the deployed frontend URL when hosting the app.

Docker is optional. The frontend can be deployed to Vercel or Netlify, and the FastAPI backend can be deployed to Render, Railway, Fly.io, or Cloud Run. FAISS is currently held in memory per ingest session, which is appropriate for a simple demo; persistent storage should be added before multi-instance production use.
