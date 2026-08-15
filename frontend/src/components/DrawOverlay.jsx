import { useRef, useState } from "react";

// Absolutely positioned over the video box (0-100 normalized coordinate
// space so it scales cleanly with the video's rendered size). In
// `interactive` mode it captures freehand strokes; otherwise it just
// renders whatever `strokes` it's given, read-only.
export default function DrawOverlay({ interactive, strokes, onStrokesChange, color = "#ff3d5a" }) {
  const svgRef = useRef(null);
  const [current, setCurrent] = useState(null);

  function toPoint(e) {
    const rect = svgRef.current.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * 100];
  }

  function onPointerDown(e) {
    if (!interactive) return;
    try {
      svgRef.current.setPointerCapture(e.pointerId);
    } catch {
      // Ignore — capture is a nice-to-have; onPointerLeave still ends the stroke.
    }
    setCurrent([toPoint(e)]);
  }

  function onPointerMove(e) {
    if (!interactive || !current) return;
    setCurrent((pts) => [...pts, toPoint(e)]);
  }

  function onPointerUp() {
    if (!interactive || !current) return;
    if (current.length > 1) onStrokesChange([...strokes, current]);
    setCurrent(null);
  }

  const allStrokes = current ? [...strokes, current] : strokes;

  return (
    <svg
      ref={svgRef}
      className="draw-overlay"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ pointerEvents: interactive ? "auto" : "none", cursor: interactive ? "crosshair" : "default" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {allStrokes.map((pts, i) => (
        <polyline
          key={i}
          points={pts.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
