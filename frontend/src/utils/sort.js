// SHOP-96/97: Sort options for product lists.
// Values must match the backend's SORT_OPTIONS exactly (lowercase).
// Empty value = no sort parameter, products come in id order.
export const SORT_OPTIONS = [
  { value: "", label: "Featured" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "popularity", label: "Most popular" },
];

const ALLOWED = new Set(SORT_OPTIONS.map((o) => o.value).filter(Boolean));

// The value in the URL may have been edited by hand (?sort=cheap). The backend
// would answer 400; instead we ignore unknown values and use the default order.
export function parseSort(value) {
  return value && ALLOWED.has(value) ? value : "";
}
