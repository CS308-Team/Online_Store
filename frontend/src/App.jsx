import { Route, Routes } from "react-router-dom";
import Header from "./components/Header";
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
          <Route path="/sales" element={<RoleHomePage title="Satış paneli"
            description="Fiyat, indirim ve fatura işlemleri burada yer alacak." />} />
          <Route path="/product-manager" element={<RoleHomePage title="Ürün paneli"
            description="Stok, teslimat listesi ve yorum onayları burada yer alacak." />} />
          <Route path="/support" element={<RoleHomePage title="Destek paneli"
            description="Müşteri destek talepleri burada yer alacak." />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
