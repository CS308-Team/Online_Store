import { SORT_OPTIONS } from "../utils/sort";

// SHOP-96: Sort menu for product lists (price low/high, popularity).
// Usage (search page, category page…):
//   const [sort, setSort] = useSortParam();
//   <SortSelect value={sort} onChange={setSort} />
export default function SortSelect({ value, onChange, id = "product-sort" }) {
  return (
    <div className="sort-select">
      <label htmlFor={id} className="mono-xs">Sort by</label>
      <span className="sort-select-control">
        <select
          id={id}
          className="select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value || "default"} value={o.value}>{o.label}</option>
          ))}
        </select>
      </span>
    </div>
  );
}
