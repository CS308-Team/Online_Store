import { apiRequest } from "./client";

// GET /products?search=... (backend: SHOP-147). Backend parametreyi henüz
// desteklemiyorsa bütün ürünler döner; bu yüzden sonuçlar istemcide de
// ad ve açıklamaya göre süzülür. Backend desteği gelince bu süzme zararsızdır.
export async function searchProducts(query) {
  const q = query.trim();
  const products = await apiRequest(`/products?search=${encodeURIComponent(q)}`);
  const needle = q.toLocaleLowerCase("tr-TR");
  return products.filter((p) =>
    `${p.name} ${p.description ?? ""}`.toLocaleLowerCase("tr-TR").includes(needle)
  );
}
