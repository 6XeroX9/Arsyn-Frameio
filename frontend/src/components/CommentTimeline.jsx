// Thin bar under the video. Point comments render as a small diamond;
// range (in/out) comments also get a bar spanning their duration.
// Click either to jump the player to the start.
export default function CommentTimeline({ comments, duration, onSeek }) {
  if (!duration) return null;

  return (
    <div className="timeline">
      {comments.map((c) => {
        const hasRange = c.end_timestamp_seconds && c.end_timestamp_seconds > c.timestamp_seconds;
        return (
          <div key={c.id}>
            {hasRange && (
              <div
                className={`timeline-range ${c.resolved ? "resolved" : "open"}`}
                style={{
                  left: `${(c.timestamp_seconds / duration) * 100}%`,
                  width: `${((c.end_timestamp_seconds - c.timestamp_seconds) / duration) * 100}%`,
                }}
              />
            )}
            <button
              title={c.body}
              onClick={() => onSeek(c.timestamp_seconds)}
              className={`timeline-dot ${c.resolved ? "resolved" : c.priority ? "priority" : "open"}`}
              style={{ left: `${(c.timestamp_seconds / duration) * 100}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}
