import markUrl from "../assets/brand/mark.svg";

// Loading indicator: a spinning vinyl record with the Kozalak mark on the label.
// One turn takes 1.8s — that's 33⅓ rpm, the real LP speed.
export default function VinylLoader({ label = "Loading…", size = 120 }) {
  return (
    <div className="vinyl-loader" role="status" aria-live="polite">
      <div className="vinyl" style={{ width: size, height: size }} aria-hidden="true">
        <div className="vinyl-label">
          <span className="vinyl-mark" style={{ "--src": `url(${markUrl})` }} />
        </div>
      </div>
      <span className="vinyl-text">{label}</span>
    </div>
  );
}
