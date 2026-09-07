export function Loader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="loader-dot" />
      {label}
    </div>
  );
}
