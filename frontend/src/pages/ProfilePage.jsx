import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getMe } from "../api/auth";
import { useAuth } from "../auth/useAuth";
import VinylLoader from "../components/VinylLoader";

// SHOP-126 (story SHOP-91): The customer sees their name, e-mail and home address.
// Data comes from GET /me with the login token, so it is always the saved version.
export default function ProfilePage() {
  const { auth, logout } = useAuth();
  const [state, setState] = useState({ token: null, user: null, error: null });
  const [reload, setReload] = useState(0);
  const latestRequest = useRef(0);

  useEffect(() => {
    const request = ++latestRequest.current;
    getMe(auth.token)
      .then((user) => latestRequest.current === request && setState({ token: auth.token, user, error: null }))
      .catch((error) => {
        if (latestRequest.current !== request) return;
        // token refused (expired, or the server secret changed): log out; the route guard
        // then sends the user to the login page
        if (error.status === 401) logout();
        else setState({ token: auth.token, user: null, error });
      });
  }, [auth.token, reload, logout]);

  if (state.token !== auth.token) return <VinylLoader label="Loading your profile…" />;

  if (state.error) {
    return (
      <section className="page page-message error" role="alert">
        <p>{state.error.status === 0 ? state.error.message : "Couldn't load your profile. Please try again."}</p>
        <button type="button" className="link" onClick={() => setReload((n) => n + 1)}>Try again</button>
      </section>
    );
  }

  const { user } = state;
  return (
    <section className="page profile-page">
      <div className="section-head">
        <div>
          <span className="mono-xs">My account</span>
          <h1 className="page-title profile-name">{user.name}</h1>
        </div>
        <span className="mono-xs">{user.role ?? auth.role}</span>
      </div>

      <div className="card profile-card">
        <h2 className="mono-xs product-section-label">Personal details</h2>
        <dl className="spec-list">
          <div className="spec-row"><dt className="mono-xs">Name</dt><dd>{user.name}</dd></div>
          <div className="spec-row"><dt className="mono-xs">E-mail</dt><dd>{user.email}</dd></div>
          <div className="spec-row">
            <dt className="mono-xs">Home address</dt>
            <dd className="profile-address">{user.home_address || <span className="muted">Not added</span>}</dd>
          </div>
        </dl>
      </div>

      <Link to="/" className="link profile-back">Back to shop</Link>
    </section>
  );
}
