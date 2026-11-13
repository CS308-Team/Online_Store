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

// extra header links for each role; guests and customers only see the shop
export const ROLE_MENU = {
  "Sales Manager": [{ to: "/sales", label: "Sales dashboard" }],
  "Product Manager": [
    { to: "/product-manager", label: "Product dashboard", end: true },
    { to: "/product-manager/deliveries", label: "Deliveries" },
  ],
  "Support Agent": [{ to: "/support", label: "Support dashboard" }],
};

export const menuFor = (role) => ROLE_MENU[role] ?? [];
