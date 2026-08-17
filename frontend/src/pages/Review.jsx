import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import VideoPlayer from "../components/VideoPlayer.jsx";
import CommentTimeline from "../components/CommentTimeline.jsx";
import VersionSelector from "../components/VersionSelector.jsx";
import DrawOverlay from "../components/DrawOverlay.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:8787/api";
const FRAME_STEP = 1 / 25; // approximate — schema doesn't track source fps
const NAME_KEY = "review_tool_reviewer_name";

export default function Review() {
  const { token } = useParams();
  const [project, setProject] = useState(null);
  const [videos, setVideos] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [duration, setDuration] = useState(0);
  const [draft, setDraft] = useState("");
  const [draftPriority, setDraftPriority] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);
  const [markIn, setMarkInState] = useState(null);
  const [markOut, setMarkOutState] = useState(null);
  const [reviewerName, setReviewerName] = useState(() => localStorage.getItem(NAME_KEY) || "");
  const [nameDraft, setNameDraft] = useState("");
  const [openReplyFor, setOpenReplyFor] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [drawMode, setDrawMode] = useState(false);
  const [drawStrokes, setDrawStrokes] = useState([]);
  const [viewingAnnotation, setViewingAnnotation] = useState(null);
  const [showNotifyConfirm, setShowNotifyConfirm] = useState(false);
  const playerRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/review/${token}`)
      .then((r) => r.json())
      .then(({ project, videos }) => {
        setProject(project);
        setVideos(videos);
        setActiveId(videos.at(-1)?.id); // default to latest version
      });
  }, [token]);

  const active = videos.find((v) => v.id === activeId);

  useEffect(() => {
    setReviewSent(false);
  }, [activeId]);

  // Frame-accurate stepping — ignored while typing in an input.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const v = playerRef.current;
      if (!v) return;
      e.preventDefault();
      const t = v.getCurrentTime();
      v.seekTo(Math.max(0, t + (e.key === "ArrowRight" ? FRAME_STEP : -FRAME_STEP)));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function saveReviewerName(e) {
    e.preventDefault();
    if (!nameDraft.trim()) return;
    localStorage.setItem(NAME_KEY, nameDraft.trim());
    setReviewerName(nameDraft.trim());
  }

  async function markReviewComplete() {
    await fetch(`${API}/videos/${activeId}/review-complete`, { method: "POST" });
    setReviewSent(true);
  }

  function markInPoint() {
    setMarkInState(playerRef.current?.getCurrentTime() ?? 0);
  }

  function markOutPoint() {
    const t = playerRef.current?.getCurrentTime() ?? 0;
    if (markIn !== null && t > markIn) setMarkOutState(t);
  }

  function clearMarks() {
    setMarkInState(null);
    setMarkOutState(null);
  }

  function toggleDrawMode() {
    if (!drawMode) {
      playerRef.current?.pause();
      setViewingAnnotation(null);
      setDrawStrokes([]);
    }
    setDrawMode((d) => !d);
  }

  function seekAndShowAnnotation(comment) {
    playerRef.current?.seekTo(comment.timestamp_seconds);
    setDrawMode(false);
    setViewingAnnotation(comment.annotation ?? null);
  }

  async function submitComment() {
    if (!draft.trim()) return;
    const timestamp_seconds = markIn ?? playerRef.current?.getCurrentTime() ?? 0;
    const res = await fetch(`${API}/videos/${activeId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author_name: reviewerName || "Client",
        author_type: "client",
        timestamp_seconds,
        end_timestamp_seconds: markOut,
        priority: draftPriority,
        annotation: drawStrokes.length > 0 ? { strokes: drawStrokes, color: "#ff3d5a" } : null,
        body: draft,
      }),
    });
    const comment = await res.json();
    setVideos((vs) =>
      vs.map((v) => (v.id === activeId ? { ...v, comments: [...v.comments, comment] } : v))
    );
    setDraft("");
    setDraftPriority(false);
    setDrawMode(false);
    setDrawStrokes([]);
    clearMarks();
  }

  async function submitReply(parent) {
    if (!replyDraft.trim()) return;
    const res = await fetch(`${API}/videos/${activeId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author_name: reviewerName || "Client",
        author_type: "client",
        timestamp_seconds: parent.timestamp_seconds,
        parent_comment_id: parent.id,
        body: replyDraft,
      }),
    });
    const reply = await res.json();
    setVideos((vs) =>
      vs.map((v) => (v.id === activeId ? { ...v, comments: [...v.comments, reply] } : v))
    );
    setReplyDraft("");
    setOpenReplyFor(null);
  }

  async function toggleResolved(comment) {
    const res = await fetch(`${API}/comments/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: !comment.resolved }),
    });
    const updated = await res.json();
    setVideos((vs) =>
      vs.map((v) =>
        v.id === activeId
          ? { ...v, comments: v.comments.map((c) => (c.id === updated.id ? updated : c)) }
          : v
      )
    );
  }

  async function deleteComment(comment) {
    await fetch(`${API}/comments/${comment.id}`, { method: "DELETE" });
    setVideos((vs) =>
      vs.map((v) =>
        v.id === activeId ? { ...v, comments: v.comments.filter((c) => c.id !== comment.id) } : v
      )
    );
  }

  async function setStatus(status) {
    await fetch(`${API}/videos/${activeId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setVideos((vs) => vs.map((v) => (v.id === activeId ? { ...v, status } : v)));
  }

  function exportShotList() {
    const lines = topLevelComments.map((c) => {
      const time = c.end_timestamp_seconds
        ? `${formatTime(c.timestamp_seconds)}-${formatTime(c.end_timestamp_seconds)}`
        : formatTime(c.timestamp_seconds);
      const flag = c.priority ? " [PRIORITY]" : "";
      return `${time}${flag} — ${c.author_name}: ${c.body}`;
    });
    const text = `${project.name} — ${active.title} (v${active.version_number})\n\n${lines.join("\n") || "No comments."}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}-${active.title}-shotlist.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!project || !active) return <p className="page empty">Loading…</p>;

  const allComments = active.comments;
  const topLevelComments = allComments
    .filter((c) => !c.parent_comment_id)
    .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

  function repliesFor(id) {
    return allComments
      .filter((c) => c.parent_comment_id === id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  return (
    <div className="page review-page">
      {!reviewerName && (
        <div className="modal-overlay">
          <form className="modal-card" onSubmit={saveReviewerName}>
            <h3>Who's reviewing?</h3>
            <p style={{ margin: "4px 0 14px" }}>Your name shows up next to your comments.</p>
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Your name"
            />
            <button type="submit">Continue</button>
          </form>
        </div>
      )}

      {showNotifyConfirm && (
        <div className="modal-overlay" onClick={() => setShowNotifyConfirm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Notify the editor?</h3>
            <p style={{ margin: "4px 0 16px" }}>
              This sends a Telegram/email alert that your review is done. Make sure you're finished leaving comments.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowNotifyConfirm(false)}>
                Cancel
              </button>
              <button
                type="submit"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowNotifyConfirm(false);
                  markReviewComplete();
                }}
              >
                Yes, notify
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="eyebrow">◆ Client Review</div>
          <h2>{project.name}</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {reviewerName && (
            <span className="empty">
              Reviewing as <strong style={{ color: "var(--text)" }}>{reviewerName}</strong>
            </span>
          )}
          <VersionSelector videos={videos} activeId={activeId} onChange={setActiveId} />
        </div>
      </div>

      <div className="review-layout">
        <div className="player-col">
          <VideoPlayer
            ref={playerRef}
            src={`${API}/videos/${active.id}/stream`}
            onTimeUpdate={() => {}}
            onDuration={setDuration}
          >
            <DrawOverlay
              interactive={drawMode}
              strokes={drawMode ? drawStrokes : viewingAnnotation?.strokes ?? []}
              onStrokesChange={setDrawStrokes}
              color={drawMode ? "#ff3d5a" : viewingAnnotation?.color ?? "#ff3d5a"}
            />
          </VideoPlayer>
          {/* duration comes from the video element itself once metadata loads */}
          <CommentTimeline
            comments={topLevelComments}
            duration={duration}
            onSeek={(t) => playerRef.current?.seekTo(t)}
          />

          <div className="toolbar">
            <button type="submit" onClick={() => setStatus("approved")} disabled={active.status === "approved"}>
              {active.status === "approved" ? "Approved ✓" : "Approve this cut"}
            </button>
            <button
              className="btn-changes"
              onClick={() => setStatus("changes_requested")}
              disabled={active.status === "changes_requested"}
            >
              {active.status === "changes_requested" ? "Changes requested ✓" : "Request changes"}
            </button>
            <button
              className="btn-notify"
              style={
                reviewSent
                  ? { background: "#34d17e", borderColor: "#34d17e", color: "#06180f", opacity: 1 }
                  : undefined
              }
              onClick={() => setShowNotifyConfirm(true)}
              disabled={reviewSent}
            >
              {reviewSent ? "Editor notified ✓" : "Review done — notify editor"}
            </button>
            <button className="btn-ghost" onClick={exportShotList}>
              Export shot list
            </button>
            <button className={`btn-ghost ${drawMode ? "active" : ""}`} onClick={toggleDrawMode}>
              {drawMode ? "Drawing… (click to stop)" : "Draw"}
            </button>
            {drawMode && drawStrokes.length > 0 && (
              <button className="btn-ghost" onClick={() => setDrawStrokes([])}>
                Clear drawing
              </button>
            )}
            {viewingAnnotation && (
              <button className="btn-ghost" onClick={() => setViewingAnnotation(null)}>
                Hide drawing
              </button>
            )}
          </div>
        </div>

        <div className="sidebar">
          <div className="sidebar-header">Comments ({topLevelComments.length})</div>
          <div className="sidebar-comments">
            {topLevelComments.map((c) => (
              <div key={c.id} className={`comment-row ${c.resolved ? "resolved" : ""}`}>
                <div className="comment-meta">
                  <button className="comment-time" onClick={() => seekAndShowAnnotation(c)}>
                    {c.annotation && "🖉 "}
                    {c.end_timestamp_seconds
                      ? `${formatTime(c.timestamp_seconds)}–${formatTime(c.end_timestamp_seconds)}`
                      : formatTime(c.timestamp_seconds)}
                  </button>
                  {c.priority && <span className="badge badge-changes_requested">!</span>}
                  <strong className="comment-author">{c.author_name}</strong>
                  <span className="comment-meta-actions">
                    <button className="btn-icon" title={c.resolved ? "Reopen" : "Resolve"} onClick={() => toggleResolved(c)}>
                      {c.resolved ? "↺" : "✓"}
                    </button>
                    <button className="btn-icon" title="Delete comment" onClick={() => deleteComment(c)}>
                      ✕
                    </button>
                  </span>
                </div>
                <div className="comment-text">{c.body}</div>

                {repliesFor(c.id).map((r) => (
                  <div key={r.id} className="reply-row">
                    <strong>{r.author_name}:</strong> {r.body}
                  </div>
                ))}

                {openReplyFor === c.id ? (
                  <div className="reply-composer">
                    <input
                      autoFocus
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      placeholder="Reply…"
                      onKeyDown={(e) => e.key === "Enter" && submitReply(c)}
                    />
                    <button type="submit" onClick={() => submitReply(c)}>Send</button>
                  </div>
                ) : (
                  <button className="btn-ghost btn-icon reply-toggle" onClick={() => setOpenReplyFor(c.id)}>
                    Reply{repliesFor(c.id).length > 0 ? ` (${repliesFor(c.id).length})` : ""}
                  </button>
                )}
              </div>
            ))}
            {topLevelComments.length === 0 && <p className="empty" style={{ margin: 0 }}>No comments yet</p>}
          </div>
          <div className="mark-row">
            <button className="btn-ghost" onClick={markInPoint}>
              {markIn === null ? "Mark in" : `In: ${formatTime(markIn)}`}
            </button>
            <button className="btn-ghost" onClick={markOutPoint} disabled={markIn === null}>
              {markOut === null ? "Mark out" : `Out: ${formatTime(markOut)}`}
            </button>
            {(markIn !== null || markOut !== null) && (
              <button className="btn-ghost btn-icon" title="Clear range" onClick={clearMarks}>
                ✕
              </button>
            )}
            <label className="priority-toggle">
              <input type="checkbox" checked={draftPriority} onChange={(e) => setDraftPriority(e.target.checked)} />
              Priority
            </label>
          </div>
          <div className="sidebar-composer">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                markOut !== null
                  ? `Comment on ${formatTime(markIn)}–${formatTime(markOut)}…`
                  : "Leave a comment at the current timestamp…"
              }
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
            />
            <button type="submit" onClick={submitComment}>Add comment</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}
