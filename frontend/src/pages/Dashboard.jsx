import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CustomSelect from "../components/CustomSelect.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:8787/api";

// Accepts either a raw Drive file ID or a full share link and returns just the ID.
function extractDriveFileId(input) {
  const trimmed = input.trim();
  const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : trimmed;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);

  const [showClientModal, setShowClientModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  const [projectClientId, setProjectClientId] = useState("");
  const [projectName, setProjectName] = useState("");

  const [videoTitle, setVideoTitle] = useState("");
  const [videoFileId, setVideoFileId] = useState("");
  const [videoVersion, setVideoVersion] = useState(1);

  const [copiedId, setCopiedId] = useState(null);
  const [activity, setActivity] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, id, name }
  const [expandedVideoId, setExpandedVideoId] = useState(null);
  const [replyFor, setReplyFor] = useState(null); // comment id
  const [replyDraft, setReplyDraft] = useState("");

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then((r) => r.json())
      .then(({ authenticated }) => {
        if (!authenticated) return navigate("/login");
        setAuthChecked(true);
        loadClients();
        loadProjects();
        loadActivity();
      });
  }, []);

  useEffect(() => {
    setShowAddVideo(false);
    setExpandedVideoId(null);
    setReplyFor(null);
    if (!selectedId) return setDetail(null);
    fetch(`${API}/projects/${selectedId}`, { credentials: "include" })
      .then((r) => r.json())
      .then(setDetail);
  }, [selectedId]);

  function loadClients() {
    fetch(`${API}/clients`, { credentials: "include" }).then((r) => r.json()).then(setClients);
  }

  function loadProjects() {
    fetch(`${API}/projects`, { credentials: "include" }).then((r) => r.json()).then(setProjects);
  }

  function loadActivity() {
    fetch(`${API}/activity`, { credentials: "include" }).then((r) => r.json()).then(setActivity);
  }

  async function changePassword(e) {
    e.preventDefault();
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match");
      return;
    }
    const res = await fetch(`${API}/auth/change-password`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      setPasswordError(error || "Failed to change password");
      return;
    }
    setPasswordSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => {
      setShowPasswordModal(false);
      setPasswordSuccess(false);
    }, 1500);
  }

  async function logout() {
    await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
    navigate("/login");
  }

  async function createClient(e) {
    e.preventDefault();
    if (!clientName.trim()) return;
    await fetch(`${API}/clients`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clientName, email: clientEmail || null }),
    });
    setClientName("");
    setClientEmail("");
    setShowClientModal(false);
    loadClients();
  }

  async function createProject(e) {
    e.preventDefault();
    if (!projectClientId || !projectName.trim()) return;
    await fetch(`${API}/projects`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: projectClientId, name: projectName }),
    });
    setProjectName("");
    setShowProjectModal(false);
    loadProjects();
  }

  async function createVideo(e) {
    e.preventDefault();
    if (!selectedId || !videoTitle.trim() || !videoFileId.trim()) return;
    await fetch(`${API}/videos`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: selectedId,
        title: videoTitle,
        drive_file_id: extractDriveFileId(videoFileId),
        version_number: Number(videoVersion) || 1,
      }),
    });
    setVideoTitle("");
    setVideoFileId("");
    setVideoVersion((v) => Number(v) + 1);
    setShowAddVideo(false);
    fetch(`${API}/projects/${selectedId}`, { credentials: "include" }).then((r) => r.json()).then(setDetail);
    loadProjects();
  }

  async function performDelete() {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;
    const path = type === "client" ? "clients" : type === "project" ? "projects" : "videos";
    await fetch(`${API}/${path}/${id}`, { method: "DELETE", credentials: "include" });
    setConfirmDelete(null);

    if (type === "client") loadClients();
    if (type === "project" || type === "client") {
      if (selectedId === id || (type === "client" && detail?.client?.id === id)) {
        setSelectedId(null);
      }
      loadProjects();
    }
    if (type === "video") {
      fetch(`${API}/projects/${selectedId}`, { credentials: "include" }).then((r) => r.json()).then(setDetail);
      loadProjects();
    }
  }

  async function submitDashboardReply(video, parentComment) {
    if (!replyDraft.trim()) return;
    await fetch(`${API}/videos/${video.id}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author_name: "Editor",
        author_type: "editor",
        timestamp_seconds: parentComment.timestamp_seconds,
        parent_comment_id: parentComment.id,
        body: replyDraft,
      }),
    });
    setReplyDraft("");
    setReplyFor(null);
    fetch(`${API}/projects/${selectedId}`, { credentials: "include" }).then((r) => r.json()).then(setDetail);
  }

  function copyLink(project) {
    const url = `${window.location.origin}/review/${project.access_token}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedId(project.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  if (!authChecked) return null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">◆ Internal</div>
          <h1>Review Tool Dashboard</h1>
          <p style={{ margin: 0 }}>Manage clients, projects, and video versions</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-ghost" onClick={() => setShowClientModal(true)}>
            + New client
          </button>
          <button type="submit" onClick={() => setShowProjectModal(true)}>
            + New project
          </button>
          <button className="btn-ghost" onClick={() => setShowPasswordModal(true)}>
            Change password
          </button>
          <button className="btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      <div className="dashboard-layout">
        <aside className="dash-sidebar">
          <div className="card">
            <h3>Clients</h3>
            <ul style={{ marginTop: 10 }}>
              {clients.map((c) => (
                <li
                  key={c.id}
                  style={{
                    padding: "6px 0",
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    {c.name}
                    {c.email && <div style={{ color: "var(--text-faint)", fontSize: 12 }}>{c.email}</div>}
                  </div>
                  <button
                    className="btn-ghost btn-icon"
                    title="Delete client"
                    onClick={() => setConfirmDelete({ type: "client", id: c.id, name: c.name })}
                  >
                    ✕
                  </button>
                </li>
              ))}
              {clients.length === 0 && <li className="empty">No clients yet</li>}
            </ul>
          </div>

          <div className="card">
            <h3>Projects</h3>
            <ul style={{ marginTop: 10 }}>
              {projects.map((p) => (
                <li
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`card project-card ${selectedId === p.id ? "active" : ""}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong>{p.name}</strong>
                    <button
                      className="btn-ghost btn-icon"
                      title="Delete project"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete({ type: "project", id: p.id, name: p.name });
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="meta">
                    {p.client?.name ?? "no client"} · {p.videos?.length ?? 0} version(s)
                  </div>
                </li>
              ))}
              {projects.length === 0 && <li className="empty">No projects yet</li>}
            </ul>
          </div>
        </aside>

        <main>
          <div className="card">
            {!detail && <p className="empty">Select a project on the left to manage its videos.</p>}
            {detail && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <h2 style={{ margin: 0 }}>{detail.name}</h2>
                  <span style={{ color: "var(--text-faint)" }}>{detail.client?.name}</span>
                </div>
                <div className="actions" style={{ marginBottom: 16 }}>
                  <Link to={`/review/${detail.access_token}`} target="_blank" rel="noreferrer">
                    Open review page
                  </Link>
                  <button
                    className="btn-ghost"
                    onClick={() => copyLink(detail)}
                  >
                    {copiedId === detail.id ? "Copied!" : "Copy link"}
                  </button>
                </div>

                {(() => {
                  const byReviewer = {};
                  for (const v of detail.videos) {
                    for (const c of v.comments ?? []) {
                      if (c.author_type !== "client") continue;
                      const r = (byReviewer[c.author_name] ??= { count: 0, last: c.created_at });
                      r.count += 1;
                      if (c.created_at > r.last) r.last = c.created_at;
                    }
                  }
                  const reviewers = Object.entries(byReviewer).sort((a, b) => (a[1].last < b[1].last ? 1 : -1));
                  if (reviewers.length === 0) return null;
                  return (
                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ marginTop: 0 }}>Reviewers</h4>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {reviewers.map(([name, r]) => (
                          <span
                            key={name}
                            className="card"
                            style={{ padding: "6px 12px", display: "flex", alignItems: "baseline", gap: 6 }}
                          >
                            <strong>{name}</strong>
                            <span style={{ color: "var(--text-faint)", fontSize: 12 }}>
                              {r.count} comment{r.count !== 1 ? "s" : ""} · {timeAgo(r.last)}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <h4 style={{ marginTop: 0 }}>Video versions</h4>
                <ul>
                  {detail.videos.map((v) => {
                    const topLevel = (v.comments ?? [])
                      .filter((c) => !c.parent_comment_id)
                      .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
                    const repliesFor = (id) =>
                      (v.comments ?? [])
                        .filter((c) => c.parent_comment_id === id)
                        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                    const expanded = expandedVideoId === v.id;

                    return (
                      <li key={v.id} style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span>
                            <span style={{ color: "var(--text-faint)", fontSize: 12 }}>v{v.version_number}</span>{" "}
                            {v.title}{" "}
                            <span className={`badge badge-${v.status}`}>{v.status.replace("_", " ")}</span>
                          </span>
                          <span style={{ display: "flex", gap: 4 }}>
                            <button
                              className="btn-ghost btn-icon"
                              onClick={() => setExpandedVideoId(expanded ? null : v.id)}
                            >
                              💬 {topLevel.length}
                            </button>
                            <button
                              className="btn-ghost btn-icon"
                              title="Delete video"
                              onClick={() => setConfirmDelete({ type: "video", id: v.id, name: v.title })}
                            >
                              ✕
                            </button>
                          </span>
                        </div>

                        {expanded && (
                          <div style={{ marginTop: 8 }}>
                            {topLevel.map((c) => (
                              <div key={c.id} className={`comment-row ${c.resolved ? "resolved" : ""}`}>
                                <div className="comment-meta">
                                  <span className="comment-time">{formatTime(c.timestamp_seconds)}</span>
                                  {c.priority && <span className="badge badge-changes_requested">!</span>}
                                  <strong className="comment-author">{c.author_name}</strong>
                                </div>
                                <div className="comment-text">{c.body}</div>

                                {repliesFor(c.id).map((r) => (
                                  <div key={r.id} className="reply-row">
                                    <strong>{r.author_name}:</strong> {r.body}
                                  </div>
                                ))}

                                {replyFor === c.id ? (
                                  <div className="reply-composer">
                                    <input
                                      autoFocus
                                      value={replyDraft}
                                      onChange={(e) => setReplyDraft(e.target.value)}
                                      placeholder="Reply as editor…"
                                      onKeyDown={(e) => e.key === "Enter" && submitDashboardReply(v, c)}
                                    />
                                    <button type="submit" onClick={() => submitDashboardReply(v, c)}>
                                      Send
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    className="btn-ghost btn-icon reply-toggle"
                                    onClick={() => {
                                      setReplyFor(c.id);
                                      setReplyDraft("");
                                    }}
                                  >
                                    Reply{repliesFor(c.id).length > 0 ? ` (${repliesFor(c.id).length})` : ""}
                                  </button>
                                )}
                              </div>
                            ))}
                            {topLevel.length === 0 && <p className="empty" style={{ margin: 0 }}>No comments yet</p>}
                          </div>
                        )}
                      </li>
                    );
                  })}
                  {detail.videos.length === 0 && <li className="empty">No videos yet</li>}
                </ul>

                {showAddVideo ? (
                  <>
                    <h4>Add a video version</h4>
                    <form onSubmit={createVideo}>
                      <div className="field-row">
                        <input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Title" />
                      </div>
                      <div className="field-row">
                        <input
                          value={videoFileId}
                          onChange={(e) => setVideoFileId(e.target.value)}
                          placeholder="Google Drive share link or file ID"
                          style={{ flex: 1, minWidth: 200 }}
                        />
                      </div>
                      <div className="field-row">
                        <input type="number" value={videoVersion} onChange={(e) => setVideoVersion(e.target.value)} />
                        <button type="submit">Add video</button>
                        <button className="btn-ghost" type="button" onClick={() => setShowAddVideo(false)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <button className="btn-ghost" onClick={() => setShowAddVideo(true)} style={{ marginTop: 8 }}>
                    + Add version
                  </button>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <section className="section" style={{ marginTop: 32 }}>
        <button className="activity-toggle" onClick={() => setShowActivity((s) => !s)}>
          <span>
            Recent activity <span className="activity-count">{activity.length}</span>
          </span>
          <span className={`chevron ${showActivity ? "open" : ""}`}>▾</span>
        </button>
        {showActivity && (
          <ul className="activity-list">
            {activity.map((a) => (
              <li key={a.id} className="activity-row">
                <span className="activity-line">
                  {a.priority && <span className="badge badge-changes_requested">!</span>}
                  <strong>{a.author_name}</strong>
                  <span className="comment-text" style={{ padding: 0 }}>{a.body}</span>
                </span>
                <span className="activity-meta">
                  {a.video?.project?.name} / {a.video?.title} · {timeAgo(a.created_at)}
                </span>
              </li>
            ))}
            {activity.length === 0 && <li className="empty">No activity yet</li>}
          </ul>
        )}
      </section>

      {showClientModal && (
        <div className="modal-overlay" onClick={() => setShowClientModal(false)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={createClient}>
            <h3>New client</h3>
            <input
              autoFocus
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client name"
              style={{ marginTop: 12 }}
            />
            <input
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="Email (optional)"
            />
            <button type="submit">Add client</button>
          </form>
        </div>
      )}

      {showProjectModal && (
        <div className="modal-overlay" onClick={() => setShowProjectModal(false)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={createProject}>
            <h3>New project</h3>
            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <CustomSelect
                value={projectClientId}
                onChange={setProjectClientId}
                placeholder="Select client…"
                options={clients.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project name" />
            <button type="submit">Add project</button>
          </form>
        </div>
      )}

      {showPasswordModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowPasswordModal(false);
            setPasswordError("");
          }}
        >
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={changePassword}>
            <h3>Change password</h3>
            {passwordSuccess ? (
              <p style={{ color: "var(--success)", margin: "12px 0 0" }}>Password changed ✓</p>
            ) : (
              <>
                <input
                  autoFocus
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  style={{ marginTop: 12 }}
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 8 characters)"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
                {passwordError && <p style={{ color: "var(--danger)", fontSize: 13 }}>{passwordError}</p>}
                <button type="submit">Change password</button>
              </>
            )}
          </form>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Delete {confirmDelete.type}?</h3>
            <p style={{ margin: "4px 0 16px" }}>
              {confirmDelete.type === "client" &&
                `This permanently deletes "${confirmDelete.name}" and all of their projects, videos, and comments.`}
              {confirmDelete.type === "project" &&
                `This permanently deletes "${confirmDelete.name}" and all its videos and comments.`}
              {confirmDelete.type === "video" &&
                `This permanently deletes "${confirmDelete.name}" and all its comments.`}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button
                style={{ flex: 1, background: "var(--danger)", borderColor: "var(--danger)", color: "#1a0a0a" }}
                onClick={performDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
