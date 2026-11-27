const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "TRY", currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 0, maximumFractionDigits: 2,
}); // ₺1,250 · ₺1,250.50

export const formatPrice = (value) => priceFormatter.format(Number(value));
