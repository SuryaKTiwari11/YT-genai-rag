import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowUpRight, ChevronDown, CircleAlert, Database, FileText, LoaderCircle, Play, Search, Sparkles } from "lucide-react";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function App() {
  const [videoUrl, setVideoUrl] = useState("");
  const [question, setQuestion] = useState("");
  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [showEvidence, setShowEvidence] = useState(true);

  async function ingestVideo(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setSession(null);
    if (!videoUrl.trim()) return setError("Paste a YouTube URL to begin.");

    setStatus("ingesting");
    try {
      const response = await fetch(`${API_BASE_URL}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_url: videoUrl.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Could not process this video.");
      setSession(payload);
      setStatus("ready");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("idle");
    }
  }

  async function askQuestion(event) {
    event.preventDefault();
    setError("");
    if (!session) return setError("Process a video before asking a question.");
    if (!question.trim()) return setError("Ask a question about the transcript.");

    setStatus("asking");
    try {
      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.session_id, question: question.trim(), top_k: 4 }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Could not answer this question.");
      setResult(payload);
      setStatus("ready");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("ready");
    }
  }

  const isBusy = status === "ingesting" || status === "asking";

  return (
    <main className="app-shell">
      <nav className="topbar">
        <div className="brand"><span className="brand-mark"><Sparkles size={16} /></span> Transcript Room</div>
        <div className="nav-status"><span className="status-dot" /> Gemini RAG <span className="nav-divider" /> FAISS index</div>
      </nav>

      <section className="hero">
        <div className="eyebrow"><span className="eyebrow-line" /> YOUTUBE TRANSCRIPT RAG <span className="eyebrow-line" /></div>
        <h1>Ask the video.<br /><em>Trust the evidence.</em></h1>
        <p className="hero-copy">Turn a YouTube transcript into a searchable knowledge base, then ask Gemini questions grounded in what was actually said.</p>
      </section>

      <section className="workspace">
        <div className="pipeline-strip">
          {[{ icon: FileText, label: "Transcript" }, { icon: Search, label: "Semantic search" }, { icon: Sparkles, label: "Grounded answer" }].map(({ icon: Icon, label }, index) => (
            <div className="pipeline-step" key={label}><span className="pipeline-icon"><Icon size={16} /></span><span>{label}</span>{index < 2 && <span className="pipeline-arrow">→</span>}</div>
          ))}
        </div>

        <form className="ingest-card" onSubmit={ingestVideo}>
          <div className="card-kicker">01 / INGEST A SOURCE</div>
          <div className="form-row">
            <label className="field-label" htmlFor="video-url">YouTube URL</label>
            <div className="input-wrap"><Play size={17} /><input id="video-url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></div>
            <button className="primary-button" disabled={isBusy} type="submit">{status === "ingesting" ? <LoaderCircle className="spin" size={17} /> : <Database size={17} />} {status === "ingesting" ? "Indexing..." : "Process video"}</button>
          </div>
          {session && <div className="source-summary"><span className="success-mark">✓</span><strong>{session.title}</strong><span>{session.chunk_count} searchable chunks</span><a href={session.source} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={14} /></a></div>}
        </form>

        <form className="question-panel" onSubmit={askQuestion}>
          <div className="question-heading"><div><div className="card-kicker">02 / QUESTION THE TRANSCRIPT</div><h2>What would you like to know?</h2></div><span className="k-badge">TOP-K <strong>4</strong></span></div>
          <div className="question-row"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={session ? "Ask something specific about this video..." : "Process a video first..."} disabled={!session || isBusy} /><button className="ask-button" disabled={!session || isBusy} type="submit">{status === "asking" ? <LoaderCircle className="spin" size={17} /> : <ArrowUpRight size={17} />} Ask Gemini</button></div>
          <div className="suggestions"><span>Try asking:</span><button type="button" onClick={() => setQuestion("What is the main argument of this video?")}>main argument</button><button type="button" onClick={() => setQuestion("What examples does the speaker give?")}>key examples</button><button type="button" onClick={() => setQuestion("What recommendations are made?")}>recommendations</button></div>
        </form>

        {error && <div className="error-banner"><CircleAlert size={18} /><span>{error}</span></div>}

        {result && <section className="answer-area">
          <div className="answer-header"><div><div className="card-kicker">03 / GROUNDED RESPONSE</div><h2>Answer with evidence</h2></div><span className="grounded-badge"><span className="status-dot" /> Grounded in transcript</span></div>
          <div className="answer-grid"><article className="answer-card"><div className="answer-label"><Sparkles size={15} /> GEMINI RESPONSE</div><p>{result.answer}</p><div className="answer-source"><span>Source</span><a href={result.source.source} target="_blank" rel="noreferrer">{result.source.title} <ArrowUpRight size={14} /></a></div></article><aside className="evidence-card"><button className="evidence-toggle" onClick={() => setShowEvidence(!showEvidence)} type="button"><span><Search size={15} /> RETRIEVED EVIDENCE <b>{result.retrieved_chunks.length}</b></span><ChevronDown className={showEvidence ? "rotate" : ""} size={17} /></button>{showEvidence && <div className="evidence-list">{result.retrieved_chunks.map((chunk, index) => <div className="evidence-item" key={`${chunk.metadata.video_id}-${index}`}><div className="evidence-meta"><span>CHUNK {String(index + 1).padStart(2, "0")}</span><span>distance {chunk.score.toFixed(3)}</span></div><p>{chunk.text}</p></div>)}</div>}</aside></div>
        </section>}
      </section>
      <footer><span>RAG = Retrieval + Augmentation + Generation</span><span>Context first. Answers second.</span></footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
