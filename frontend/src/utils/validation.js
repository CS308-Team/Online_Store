// SHOP-103: İstemci tarafı doğrulama. Kurallar backend'deki RegisterRequest /
// LoginRequest modelleriyle (backend/main.py) aynı tutulur; böylece kullanıcı
// hatayı sunucuya gitmeden görür.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const byteLength = (s) => new TextEncoder().encode(s).length;

export function validateEmail(email) {
  const v = email.trim();
  if (!v) return "E-posta adresini gir.";
  if (!EMAIL_RE.test(v)) return "Geçerli bir e-posta adresi gir.";
  return "";
}

export function validateRegister(values) {
  const errors = {};
  const name = values.name.trim();
  const taxId = values.taxId.trim();
  const address = values.homeAddress.trim();

  if (!name) errors.name = "Ad soyad gir.";
  else if (name.length < 2) errors.name = "Ad soyad en az 2 karakter olmalı.";
  else if (name.length > 200) errors.name = "Ad soyad en fazla 200 karakter olabilir.";

  if (!taxId) errors.taxId = "Vergi numarası veya T.C. kimlik numarası gir.";
  else if (!/^\d+$/.test(taxId)) errors.taxId = "Sadece rakam girilebilir.";
  else if (taxId.length < 10 || taxId.length > 11) errors.taxId = "10 haneli vergi no veya 11 haneli T.C. kimlik no gir.";

  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;

  if (!address) errors.homeAddress = "Ev adresini gir.";
  else if (address.length < 5) errors.homeAddress = "Adres en az 5 karakter olmalı.";

  if (!values.password) errors.password = "Şifre belirle.";
  else if (values.password.length < 8) errors.password = "En az 8 karakter olmalı.";
  else if (byteLength(values.password) > 72) errors.password = "Şifre çok uzun (en fazla 72 bayt).";

  if (!values.passwordConfirm) errors.passwordConfirm = "Şifreyi tekrar gir.";
  else if (values.password !== values.passwordConfirm) errors.passwordConfirm = "Şifreler eşleşmiyor.";

  return errors;
}

export function validateLogin(values) {
  const errors = {};
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;
  if (!values.password) errors.password = "Şifreni gir.";
  return errors;
}

// FastAPI'nin 422 cevabındaki alan adlarını formdaki alanlara çevirir.
const FIELD_MAP = { name: "name", tax_id: "taxId", email: "email", home_address: "homeAddress", password: "password" };
export function mapServerErrors(detail) {
  if (!Array.isArray(detail)) return {};
  const errors = {};
  for (const item of detail) {
    const field = FIELD_MAP[item?.loc?.[item.loc.length - 1]];
    if (field && !errors[field]) errors[field] = "Bu alan sunucu tarafından kabul edilmedi.";
  }
  return errors;
}
