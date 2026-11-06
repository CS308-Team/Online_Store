import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

// Frontend check only, the API still has to verify the role.
export default function RoleRoute({ allowed }) {
  const { auth } = useAuth();
  const location = useLocation();

  if (!auth) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!allowed.includes(auth.role)) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}
