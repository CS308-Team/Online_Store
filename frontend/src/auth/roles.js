// Role names from the backend's roles table (database/02_seed.sql) and
// the home page each role opens after login (SHOP-109).
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
