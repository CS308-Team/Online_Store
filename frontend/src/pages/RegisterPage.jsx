import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/auth";
import FormField from "../components/FormField";
import VinylLoader from "../components/VinylLoader";
import { mapServerErrors, validateRegister } from "../utils/validation";

// SHOP-102 kayıt formu · SHOP-103 doğrulama ve hata mesajları · SHOP-104 API bağlantısı
const EMPTY = { name: "", taxId: "", email: "", homeAddress: "", password: "", passwordConfirm: "" };

export default function RegisterPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => {
    const next = { ...values, [field]: e.target.value };
    setValues(next);
    // Alan bir kere kontrol edildiyse yazarken hatayı canlı güncelle
    if (touched[field]) setErrors((prev) => ({ ...prev, [field]: validateRegister(next)[field] }));
  };
  const blur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateRegister(values)[field] }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    const found = validateRegister(values);
    setErrors(found);
    setTouched(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, true])));
    if (Object.keys(found).length) {
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }

    setLoading(true);
    try {
      const user = await registerUser({
        name: values.name.trim(),
        taxId: values.taxId.trim(),
        email: values.email.trim(),
        homeAddress: values.homeAddress.trim(),
        password: values.password,
      });
      navigate("/login", { state: { registeredEmail: user.email } });
    } catch (err) {
      setLoading(false);
      if (err.status === 409) {
        setErrors({ email: "An account with this e-mail already exists." });
      } else if (err.status === 422) {
        setErrors(mapServerErrors(err.detail));
        setFormError("Some details were not accepted. Check the highlighted fields.");
      } else if (err.status === 0) {
        setFormError(err.message);
      } else {
        setFormError("Something went wrong while signing up. Please try again later.");
      }
    }
  };

  if (loading) return <VinylLoader label="Creating account…" />;

  const field = (id) => ({ id, value: values[id], onChange: update(id), onBlur: blur(id), error: errors[id] });

  return (
    <section className="page">
      <form className="form-card form-card-wide" onSubmit={submit} noValidate>
        <span className="mono-xs">New account</span>
        <h2 className="form-title">Sign up</h2>

        {formError && <p className="form-alert" role="alert">{formError}</p>}

        <FormField label="Full name" autoComplete="name" {...field("name")} />
        <FormField label="Tax ID" inputMode="numeric" maxLength={11}
                   hint="10 or 11 digits. Shown on your invoices." {...field("taxId")} />
        <FormField label="E-mail" type="email" autoComplete="email" {...field("email")} />
        <FormField label="Home address" as="textarea" rows={3} autoComplete="street-address"
                   {...field("homeAddress")} />
        <FormField label="Password" type="password" autoComplete="new-password"
                   hint="At least 8 characters." {...field("password")} />
        <FormField label="Confirm password" type="password" autoComplete="new-password"
                   {...field("passwordConfirm")} />

        <button type="submit" className="btn btn-block">Sign up</button>
        <hr className="divider" />
        <span className="muted">Already have an account? </span>
        <Link to="/login" className="link">Log in</Link>
      </form>
    </section>
  );
}
