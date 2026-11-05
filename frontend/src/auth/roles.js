// Backend'deki roles tablosundaki isimler (database/02_seed.sql) ve
// her rolün girişten sonra açılacak ana sayfası (SHOP-109).
export const ROLE_HOME = {
  "Customer": "/",
  "Sales Manager": "/sales",
  "Product Manager": "/product-manager",
  "Support Agent": "/support",
};

export const ROLE_LABEL = {
  "Customer": "Customer",
  "Sales Manager": "Sales manager",
  "Product Manager": "Product manager",
  "Support Agent": "Support agent",
};

export const homePathFor = (role) => ROLE_HOME[role] ?? "/";
