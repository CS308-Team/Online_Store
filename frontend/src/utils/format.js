const priceFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency", currency: "TRY", minimumFractionDigits: 0, maximumFractionDigits: 2,
});

export const formatPrice = (value) => priceFormatter.format(Number(value));
