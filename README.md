# 🎵 LangChain RAG Music Chatbot

🎯 Learn **Retrieval-Augmented Generation (RAG)** using **LangChain** for intelligent music analysis and Q&A!

## 🧠 RAG Architecture & LangChain Components

🔗 **Complete RAG Pipeline:**

- **📊 Document Retrieval**: Multi-source music data ingestion (Spotify, Genius, Audio)
- **✂️ Text Chunking**: LangChain's RecursiveCharacterTextSplitter for semantic segmentation
- **🔮 Embeddings**: GoogleGenerativeAIEmbeddings for vector representations
- **🗂️ Vector Store**: FAISS for efficient similarity search and retrieval
- **🔍 Retrieval**: Configurable similarity-based document retrieval
- **🤖 Generation**: Context-aware responses using Google Gemini LLM

🛠️ **LangChain Components Demonstrated:**

- **Text Splitters**: Optimized chunking strategies for music data
- **Embeddings**: Vector representations for semantic search
- **Vector Stores**: FAISS integration for fast similarity matching
- **Retrievers**: Configurable document retrieval with scoring
- **LLMs**: Google Gemini integration for response generation
- **Prompt Templates**: Structured RAG prompts for consistent outputs

## 🚀 Quick Start

### 1. 📦 Install Dependencies

```bash
pip install spotipy lyricsgenius python-dotenv langchain langchain-community langchain-google-genai langchain-text-splitters faiss-cpu requests openai-whisper pydub
```

### 2. 🔑 Set Up Environment

Create a `.env` file with your API keys:

```env
# Required for RAG system
GOOGLE_API_KEY=your_gemini_api_key

# Required for music data retrieval (at least one)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
GENIUS_ACCESS_TOKEN=your_genius_access_token
```

📍 **Get API Keys:**

- 🤖 [Google AI Studio](https://makersuite.google.com/app/apikey) - For Gemini AI & Embeddings
- 🎧 [Spotify Developer](https://developer.spotify.com/) - For music data retrieval
- 📝 [Genius API](https://genius.com/api-clients) - For lyrics retrieval

### 3. 🎯 Run the RAG System

- 📂 Open `chatbox.ipynb`
- ⚡ Execute cells in order to build RAG pipeline
- 🎵 Run `demonstrate_rag_workflow()` to see RAG in action!

## 🎯 RAG Learning Examples

```python
# Build complete RAG pipeline
retriever, llm, prompt, data = create_complete_rag_pipeline("Taylor Swift")

# Execute RAG query
response, sources = langchain_rag_query("What genre is this artist?", retriever, llm, prompt)

# Interactive RAG chat
interactive_rag_chat(retriever, llm, prompt)

# Audio RAG processing
audio_rag_demo("song.mp3")
```

## � RAG Concepts Demonstrated

🎯 **Document Retrieval Strategies:**

- Multi-source data ingestion (Spotify, Genius, Audio transcription)
- Intent-based retrieval optimization
- Smart query processing and term extraction

✂️ **Text Chunking with LangChain:**

- RecursiveCharacterTextSplitter with music-specific separators
- Semantic boundary preservation
- Optimal chunk sizing for embedding models

🔮 **Vector Embeddings & Storage:**

- GoogleGenerativeAIEmbeddings for semantic understanding
- FAISS vector store for efficient similarity search
- Document metadata preservation

🔍 **Retrieval Mechanisms:**

- Similarity-based document retrieval
- Configurable relevance scoring
- Context-aware document selection

🤖 **Generation with Context:**

- Prompt engineering for RAG systems
- Context-aware response generation
- Source document attribution

## 🎛️ RAG Pipeline Functions

```python
# Core RAG workflow
demonstrate_rag_workflow()           # Interactive RAG demonstration
quick_rag_test(query, question)     # Fast RAG testing
create_complete_rag_pipeline(query) # Full pipeline setup

# Audio RAG capabilities
audio_rag_demo("audio.mp3")         # Audio transcription + RAG
process_audio_document("audio.mp3") # Audio as RAG data source

# LangChain components
create_langchain_text_splitter(text)    # Document chunking
create_langchain_vector_store(chunks)   # Vector embeddings
setup_langchain_rag_system(vectorstore) # Complete RAG setup
```

## 🎵 Sample Queries for RAG Testing

💫 **Try these RAG queries:**

- 🎭 "Tell me about Taylor Swift's musical style"
- 🎸 "What makes The Beatles innovative?"
- 🏨 "Analyze the lyrics of Hotel California"
- 🎨 "Compare different rock genres"
- 📖 "What themes appear in modern pop music?"
- 🎵 "Explain the cultural impact of hip-hop"

## 🛠️ Requirements

- 🐍 Python 3.8+
- 🤖 Google Gemini API key (required)
- 🎧 Spotify API credentials (required for live music data)
- 📝 Genius API token (required for lyrics)
- 💾 Internet connection for API access

## 🎉 Why This RAG Implementation?

🎯 **Educational Focus**: Comprehensive LangChain RAG demonstration
🔧 **Production-Ready**: Real-world API integrations and error handling
🎵 **Domain-Specific**: Music-optimized chunking and retrieval strategies
🎤 **Multi-Modal**: Text + Audio RAG capabilities
💡 **Interactive**: Hands-on learning with immediate feedback
🚀 **Scalable**: Extensible architecture for other domains

## 📚 Learning Outcomes

After working with this RAG system, you'll understand:

- ✅ **RAG Architecture**: Complete retrieval-augmented generation pipeline
- ✅ **LangChain Components**: Text splitters, embeddings, vector stores, retrievers
- ✅ **Document Processing**: Chunking strategies and semantic segmentation
- ✅ **Vector Similarity**: Embedding models and similarity search
- ✅ **Context Management**: Prompt engineering for RAG systems
- ✅ **Multi-Source Retrieval**: Combining multiple data sources effectively
- ✅ **Audio Processing**: Extending RAG to multi-modal inputs
