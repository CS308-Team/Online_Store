import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth";
import { useAuth } from "../auth/useAuth";
import { homePathFor } from "../auth/roles";
import FormField from "../components/FormField";
import VinylLoader from "../components/VinylLoader";
import { validateLogin } from "../utils/validation";

// SHOP-107 giriş formu · SHOP-108 JWT kaydı · SHOP-109 role göre yönlendirme
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, login } = useAuth();
  const registeredEmail = location.state?.registeredEmail;

  const [values, setValues] = useState({ email: registeredEmail ?? "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  // Zaten giriş yapmışsa formu gösterme, kendi ana sayfasına gönder
  if (auth && !loading) return <Navigate to={homePathFor(auth.role)} replace />;

  const update = (field) => (e) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    const found = validateLogin(values);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }

    setLoading(true);
    try {
      const result = await loginUser({ email: values.email.trim(), password: values.password });
      const session = login(result);
      navigate(homePathFor(session.role), { replace: true });
    } catch (err) {
      setLoading(false);
      setValues((prev) => ({ ...prev, password: "" }));
      if (err.status === 401) setFormError("Incorrect e-mail or password.");
      else if (err.status === 422) setFormError("Enter a valid e-mail address.");
      else if (err.status === 0) setFormError(err.message);
      else setFormError("Something went wrong while logging in. Please try again later.");
    }
  };

  if (loading) return <VinylLoader label="Logging in…" />;

  return (
    <section className="page">
      <form className="form-card" onSubmit={submit} noValidate>
        <span className="mono-xs">Welcome back</span>
        <h2 className="form-title">Log in</h2>

        {registeredEmail && !formError && (
          <p className="form-notice" role="status">Your account has been created. You can log in now.</p>
        )}
        {formError && <p className="form-alert" role="alert">{formError}</p>}

        <FormField id="email" label="E-mail" type="email" autoComplete="email"
                   value={values.email} onChange={update("email")} error={errors.email} />
        <FormField id="password" label="Password" type="password" autoComplete="current-password"
                   autoFocus={Boolean(registeredEmail)}
                   value={values.password} onChange={update("password")} error={errors.password} />

        <button type="submit" className="btn btn-block">Log in</button>
        <hr className="divider" />
        <span className="muted">No account yet? </span>
        <Link to="/register" className="link">Sign up</Link>
      </form>
    </section>
  );
}
