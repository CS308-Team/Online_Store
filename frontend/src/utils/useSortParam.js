import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { parseSort } from "./sort";

// SHOP-96: The chosen sort lives in the URL as ?sort=..., so a refresh or a
// shared link keeps the same order. Other parameters (?q=) are kept.
// replace: picking a sort doesn't add history entries, so Back leaves the page.
export function useSortParam() {
  const [params, setParams] = useSearchParams();
  const sort = parseSort(params.get("sort"));

  const setSort = useCallback((value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set("sort", value);
      else next.delete("sort");
      return next;
    }, { replace: true });
  }, [setParams]);

  return [sort, setSort];
}
