import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowUpRight, ChevronDown, CircleAlert, Database, FileText, LoaderCircle, Play, Search, Sparkles } from "lucide-react";
import "./styles.css";

const envApiBase = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL = envApiBase || (import.meta.env.DEV ? "http://localhost:8000" : "/api");

function normalizeTranscriptText(rawText) {
  const lines = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const cleaned = [];

  for (const line of lines) {
    const value = line.trim();
    if (!value) continue;
    if (/^\d+$/.test(value)) continue;
    if (/^\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}$/.test(value)) continue;
    cleaned.push(value);
  }

  return cleaned.join(" ").replace(/\s+/g, " ").trim();
}

async function parseErrorPayload(response) {
  try {
    const payload = await response.clone().json();
    if (typeof payload?.detail === "string") return payload.detail;
    if (payload?.detail?.hint) return `${payload.detail.message} ${payload.detail.hint}`;
    if (payload?.detail?.message) return payload.detail.message;
    if (payload?.message) return payload.message;
  } catch {
    // ignore JSON parse errors and fall through to text parsing
  }

  try {
    const text = await response.text();
    if (text) return text;
  } catch {
    // ignore text parse errors
  }

  return "The request failed. Please try again.";
}

function App() {
  const [videoUrl, setVideoUrl] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [transcriptTitle, setTranscriptTitle] = useState("");
  const [transcriptFileName, setTranscriptFileName] = useState("");
  const [question, setQuestion] = useState("");
  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [showEvidence, setShowEvidence] = useState(true);
  const sourceUrl = session?.source?.startsWith("http") ? session.source : "";

  async function handleTranscriptFileSelect(event) {
    const [file] = event.target.files || [];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".txt") && !file.name.toLowerCase().endsWith(".srt")) {
      setError("Only .txt and .srt files are supported for transcript upload.");
      return;
    }

    try {
      const rawText = await file.text();
      const normalized = normalizeTranscriptText(rawText);
      if (!normalized) {
        setError("The uploaded file does not contain transcript text.");
        return;
      }
      setTranscriptText(normalized);
      setTranscriptFileName(file.name);
      if (!transcriptTitle.trim()) {
        const baseName = file.name.replace(/\.[^.]+$/, "");
        setTranscriptTitle(baseName || "Manual transcript upload");
      }
      setError("");
    } catch {
      setError("Could not read the uploaded transcript file.");
    }
  }

  async function loadSampleTranscript() {
    try {
      const response = await fetch("/kick.srt");
      if (!response.ok) {
        throw new Error("Sample transcript file could not be loaded.");
      }
      const sampleText = await response.text();
      setTranscriptText(normalizeTranscriptText(sampleText));
      setTranscriptTitle("Kick (Salman Khan) built-in sample SRT");
      setTranscriptFileName("kick.srt");
      setError("");
    } catch {
      setError("Could not load the built-in sample transcript.");
    }
  }

  async function ingestVideo(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setSession(null);
    if (!videoUrl.trim() && !transcriptText.trim()) {
      return setError("Paste a YouTube URL or provide transcript text to begin.");
    }
    if (!accessCode.trim()) return setError("Enter the access code to use this app.");

    setStatus("ingesting");
    try {
      const requestBody = {
        video_url: videoUrl.trim() || null,
        transcript_text: transcriptText.trim() || null,
        transcript_title: transcriptTitle.trim() || null,
        transcript_source: transcriptFileName
          ? `Uploaded file: ${transcriptFileName}`
          : transcriptText.trim()
            ? "Manual transcript paste"
            : null,
        access_code: accessCode.trim(),
      };

      const response = await fetch(`${API_BASE_URL}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const message = await parseErrorPayload(response);
        throw new Error(message);
      }

      const responseData = await response.json();
      setSession(responseData);
      setStatus("ready");
    } catch (requestError) {
      const message = requestError instanceof TypeError
        ? "Could not reach the backend. Check the API URL and backend status."
        : requestError.message || "Could not process this video.";
      setError(message);
      setStatus("idle");
    }
  }

  async function askQuestion(event) {
    event.preventDefault();
    setError("");
    if (!session) return setError("Process a video before asking a question.");
    if (!question.trim()) return setError("Ask a question about the transcript.");
    if (!accessCode.trim()) return setError("Enter the access code to use this app.");

    setStatus("asking");
    try {
      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.session_id, question: question.trim(), top_k: 4, access_code: accessCode.trim() }),
      });

      if (!response.ok) {
        const message = await parseErrorPayload(response);
        throw new Error(message);
      }

      const payload = await response.json();
      setResult(payload);
      setStatus("ready");
    } catch (requestError) {
      const message = requestError instanceof TypeError
        ? "Could not reach the backend. Check the API URL and backend status."
        : requestError.message || "Could not answer this question.";
      setError(message);
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
          <div className="fallback-note">
            <strong>Recruiter note:</strong> We first try server-side YouTube transcript retrieval. If it is blocked or unavailable, this UI supports manual transcript paste or .txt/.srt upload.
          </div>
          <div className="form-row">
            <label className="field-label" htmlFor="video-url">YouTube URL</label>
            <div className="input-wrap"><Play size={17} /><input id="video-url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></div>
          </div>
          <div className="form-row">
            <label className="field-label" htmlFor="access-code">Access code</label>
            <div className="input-wrap"><Sparkles size={17} /><input id="access-code" type="password" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} placeholder="Enter access code" /></div>
          </div>
          <div className="form-row transcript-row">
            <label className="field-label" htmlFor="transcript-title">Transcript title</label>
            <div className="input-wrap"><FileText size={17} /><input id="transcript-title" value={transcriptTitle} onChange={(event) => setTranscriptTitle(event.target.value)} placeholder="Optional label for manual transcript" /></div>
          </div>
          <div className="form-row transcript-row">
            <label className="field-label" htmlFor="transcript-text">Transcript text</label>
            <textarea
              id="transcript-text"
              value={transcriptText}
              onChange={(event) => setTranscriptText(event.target.value)}
              placeholder="Fallback mode: paste transcript text here, or upload a .txt/.srt file below"
            />
          </div>
          <div className="transcript-actions">
            <label className="file-upload-button" htmlFor="transcript-file">Upload .txt/.srt</label>
            <input id="transcript-file" className="file-input" type="file" accept=".txt,.srt,text/plain,application/x-subrip" onChange={handleTranscriptFileSelect} />
            <button type="button" className="ghost-button" onClick={loadSampleTranscript}>Use built-in sample .srt (Kick)</button>
            {transcriptFileName && <span className="upload-chip">Loaded: {transcriptFileName}</span>}
          </div>
          <button className="primary-button" disabled={isBusy} type="submit">{status === "ingesting" ? <LoaderCircle className="spin" size={17} /> : <Database size={17} />} {status === "ingesting" ? "Indexing..." : "Process video"}</button>
          {session && <div className="source-summary"><span className="success-mark">✓</span><strong>{session.title}</strong><span>{session.chunk_count} searchable chunks</span>{sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={14} /></a> : <span className="manual-source">Manual source</span>}</div>}
        </form>

        <form className="question-panel" onSubmit={askQuestion}>
          <div className="question-heading"><div><div className="card-kicker">02 / QUESTION THE TRANSCRIPT</div><h2>What would you like to know?</h2></div><span className="k-badge">TOP-K <strong>4</strong></span></div>
          <div className="question-row"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={session ? "Ask something specific about this video..." : "Process a video first..."} disabled={!session || isBusy} /><button className="ask-button" disabled={!session || isBusy} type="submit">{status === "asking" ? <LoaderCircle className="spin" size={17} /> : <ArrowUpRight size={17} />} Ask Gemini</button></div>
          <div className="suggestions"><span>Try asking:</span><button type="button" onClick={() => setQuestion("What is the main argument of this video?")}>main argument</button><button type="button" onClick={() => setQuestion("What examples does the speaker give?")}>key examples</button><button type="button" onClick={() => setQuestion("What recommendations are made?")}>recommendations</button></div>
        </form>

        {error && <div className="error-banner"><CircleAlert size={18} /><span>{error}</span></div>}

        {result && <section className="answer-area">
          <div className="answer-header"><div><div className="card-kicker">03 / GROUNDED RESPONSE</div><h2>Answer with evidence</h2></div><span className="grounded-badge"><span className="status-dot" /> Grounded in transcript</span></div>
          <div className="answer-grid"><article className="answer-card"><div className="answer-label"><Sparkles size={15} /> GEMINI RESPONSE</div><p>{result.answer}</p><div className="answer-source"><span>Source</span>{result.source.source?.startsWith("http") ? <a href={result.source.source} target="_blank" rel="noreferrer">{result.source.title} <ArrowUpRight size={14} /></a> : <span>{result.source.title}</span>}</div></article><aside className="evidence-card"><button className="evidence-toggle" onClick={() => setShowEvidence(!showEvidence)} type="button"><span><Search size={15} /> RETRIEVED EVIDENCE <b>{result.retrieved_chunks.length}</b></span><ChevronDown className={showEvidence ? "rotate" : ""} size={17} /></button>{showEvidence && <div className="evidence-list">{result.retrieved_chunks.map((chunk, index) => <div className="evidence-item" key={`${chunk.metadata.video_id}-${index}`}><div className="evidence-meta"><span>CHUNK {String(index + 1).padStart(2, "0")}</span><span>distance {chunk.score.toFixed(3)}</span></div><p>{chunk.text}</p></div>)}</div>}</aside></div>
        </section>}
      </section>
      <footer><span>RAG = Retrieval + Augmentation + Generation</span><span>Context first. Answers second.</span></footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
