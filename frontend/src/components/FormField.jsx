// Small wrapper around the style package's .field / .input / .field-error markup
// so it is not repeated in every form.
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
