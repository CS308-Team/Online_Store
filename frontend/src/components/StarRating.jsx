// Shows an average rating (0–5) with partially filled gold stars.
// Stars are gold (#D99A2B, --gold). Used on product cards; reused later
// for the review section (Sprint 3).
export default function StarRating({ value = 0, count, max = 5 }) {
  const rating = Math.max(0, Math.min(max, Number(value) || 0));
  const percent = (rating / max) * 100;
  const stars = "★".repeat(max);

  return (
    <div className="star-rating" aria-label={`Rated ${rating.toFixed(1)} out of ${max}`}>
      <span className="stars" aria-hidden="true">
        <span className="stars-empty">{stars}</span>
        <span className="stars-full" style={{ width: `${percent}%` }}>{stars}</span>
      </span>
      {count !== undefined && <span>({count})</span>}
    </div>
  );
}
