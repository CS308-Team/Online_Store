// Müşteri ana sayfası. Ürün listesi ve kategoriler başka subtask'larda
// (SHOP-93/94/95, SHOP-100) eklenecek; şimdilik karşılama alanı.
export default function HomePage() {
  return (
    <section className="page">
      <span className="mono-xs">Kozalak plak dükkânı</span>
      <h1 className="hero-title">Pikap, <em className="highlight">plak</em> ve dinleme ekipmanı.</h1>
      <p className="muted hero-text">Aradığın albümü ya da cihazı yukarıdaki arama çubuğundan bul.</p>
    </section>
  );
}
