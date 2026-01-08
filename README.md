# Music RAG System

A simple RAG system using LangChain for music analysis with Spotify and Genius APIs.

## What it does

1. **Gets music data** from Spotify API (track info, audio features)
2. **Gets lyrics** from Genius API
3. **Creates documents** from the music data
4. **Splits into chunks** and creates embeddings
5. **Stores in FAISS** vector database
6. **Answers questions** about the music using retrieval + LLM

## Quick Start

### Install

```bash
pip install spotipy lyricsgenius python-dotenv langchain langchain-community langchain-google-genai langchain-text-splitters faiss-cpu
```

### Setup

Create `.env` file:

```env
GOOGLE_API_KEY=your_key
SPOTIFY_CLIENT_ID=your_id
SPOTIFY_CLIENT_SECRET=your_secret
GENIUS_ACCESS_TOKEN=your_token
```

### Use

```python
analyze_track("4iV5W9uYEdYUVa79Axb7Rh", "What is the mood of this song?")
```

## How RAG works here

- **Data**: Spotify track info + lyrics
- **Documents**: LangChain Document objects
- **Chunking**: Split text into smaller pieces
- **Embeddings**: Convert text to vectors
- **Storage**: FAISS vector database
- **Retrieval**: Find relevant chunks for questions
- **Generation**: LLM creates answers from context

That's it!
