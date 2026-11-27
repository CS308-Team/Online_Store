// Placeholder artwork for products without a photo: a vinyl record
// on a pastel background. The tint rotates by product id so a grid
// never shows the same color twice in a row.
const TINTS = ["var(--tint-petrol)", "var(--tint-pink)", "var(--tint-sand)", "var(--tint-lime)"];

export default function RecordArt({ seed = 0 }) {
  const tint = TINTS[Math.abs(Number(seed) || 0) % TINTS.length];
  return (
    <div className="record-art" style={{ background: tint }} aria-hidden="true">
      <div className="record-art-disc"><i /></div>
    </div>
  );
}
