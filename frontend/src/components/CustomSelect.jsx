import { useEffect, useRef, useState } from "react";

// Fully custom-styled dropdown — native <select> popups ignore our theme
// on some browsers/OSes (color-scheme is unreliable), so we render the
// option list ourselves instead of relying on native UI.
export default function CustomSelect({ value, onChange, options, placeholder = "Select…" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="custom-select" ref={ref}>
      <button type="button" className="custom-select-trigger" onClick={() => setOpen((o) => !o)}>
        <span>{selected ? selected.label : placeholder}</span>
        <span className={`chevron ${open ? "open" : ""}`}>▾</span>
      </button>
      {open && (
        <ul className="custom-select-list">
          {options.map((o) => (
            <li
              key={o.value}
              className={`custom-select-option ${o.value === value ? "selected" : ""}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
