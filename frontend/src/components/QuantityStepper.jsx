import { useState } from "react";

// SHOP-115: − [n] + control. The value never goes outside min…max (max = stock).
// Typing is allowed; the number is corrected when the field loses focus.
export default function QuantityStepper({ value, onChange, min = 1, max, label = "Quantity", id }) {
  const [draft, setDraft] = useState(null); // text being typed, null when not typing
  const clamp = (n) => Math.max(min, Math.min(max, n));

  const commit = () => {
    if (draft === null) return;
    const n = Number.parseInt(draft, 10);
    setDraft(null);
    if (Number.isFinite(n) && clamp(n) !== value) onChange(clamp(n));
  };

  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="stepper-btn" aria-label={`Decrease ${label.toLowerCase()}`}
        onClick={() => onChange(clamp(value - 1))} disabled={value <= min}>−</button>
      <input
        id={id}
        className="stepper-input"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        aria-label={label}
        value={draft ?? value}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
      />
      <button type="button" className="stepper-btn" aria-label={`Increase ${label.toLowerCase()}`}
        onClick={() => onChange(clamp(value + 1))} disabled={value >= max}>+</button>
    </div>
  );
}
