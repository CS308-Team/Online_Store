// Stil paketindeki .field / .input / .field-error yapısını tekrar tekrar
// yazmamak için küçük bir sarmalayıcı.
export default function FormField({ id, label, error, hint, as = "input", ...inputProps }) {
  const Tag = as;
  const className = (as === "textarea" ? "textarea" : "input") + (error ? " invalid" : "");
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Tag id={id} name={id} className={className} aria-invalid={Boolean(error)}
           aria-describedby={describedBy} {...inputProps} />
      {error
        ? <span id={`${id}-error`} className="field-error">{error}</span>
        : hint && <span id={`${id}-hint`} className="mono-xs">{hint}</span>}
    </div>
  );
}
