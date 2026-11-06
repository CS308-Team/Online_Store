import { Route, Routes } from "react-router-dom";
import RoleRoute from "./auth/RoleRoute";
import Header from "./components/Header";
import CategoryPage from "./pages/CategoryPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import RegisterPage from "./pages/RegisterPage";
import RoleHomePage from "./pages/RoleHomePage";
import SearchPage from "./pages/SearchPage";

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/category/:name" element={<CategoryPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route element={<RoleRoute allowed={["Sales Manager"]} />}>
            <Route path="/sales" element={<RoleHomePage title="Sales dashboard"
              description="Prices, discounts and invoices will appear here." />} />
          </Route>
          <Route element={<RoleRoute allowed={["Product Manager"]} />}>
            <Route path="/product-manager" element={<RoleHomePage title="Product dashboard"
              description="Stock, the delivery list and review approvals will appear here." />} />
          </Route>
          <Route element={<RoleRoute allowed={["Support Agent"]} />}>
            <Route path="/support" element={<RoleHomePage title="Support dashboard"
              description="Customer support requests will appear here." />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
