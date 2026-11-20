// Customer home page. Product lists and categories come from other subtasks
// (SHOP-93/94/95, SHOP-100); for now this is the welcome section.
export default function HomePage() {
  return (
    <section className="page">
      <span className="mono-xs">Kozalak record store</span>
      <h1 className="hero-title">Turntables, <em className="highlight">records</em> and listening gear.</h1>
      <p className="muted hero-text">Find the album or device you want with the search bar above.</p>
    </section>
  );
}
