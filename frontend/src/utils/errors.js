// POST /orders answers 409 when a product no longer has enough stock.
export const isOutOfStockError = (err) => err?.status === 409;
