import CustomSelect from "./CustomSelect.jsx";

export default function VersionSelector({ videos, activeId, onChange }) {
  return (
    <CustomSelect
      value={activeId}
      onChange={onChange}
      options={videos.map((v) => ({
        value: v.id,
        label: `v${v.version_number} — ${v.title} (${v.status})`,
      }))}
    />
  );
}
