// SHOP-103: İstemci tarafı doğrulama. Kurallar backend'deki RegisterRequest /
// LoginRequest modelleriyle (backend/main.py) aynı tutulur; böylece kullanıcı
// hatayı sunucuya gitmeden görür.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const byteLength = (s) => new TextEncoder().encode(s).length;

export function validateEmail(email) {
  const v = email.trim();
  if (!v) return "Enter your e-mail address.";
  if (!EMAIL_RE.test(v)) return "Enter a valid e-mail address.";
  return "";
}

export function validateRegister(values) {
  const errors = {};
  const name = values.name.trim();
  const taxId = values.taxId.trim();
  const address = values.homeAddress.trim();

  if (!name) errors.name = "Enter your full name.";
  else if (name.length < 2) errors.name = "Name must be at least 2 characters.";
  else if (name.length > 200) errors.name = "Name can be at most 200 characters.";

  if (!taxId) errors.taxId = "Enter your tax ID.";
  else if (!/^\d+$/.test(taxId)) errors.taxId = "Use digits only.";
  else if (taxId.length < 10 || taxId.length > 11) errors.taxId = "Tax ID must be 10 or 11 digits.";

  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;

  if (!address) errors.homeAddress = "Enter your home address.";
  else if (address.length < 5) errors.homeAddress = "Address must be at least 5 characters.";

  if (!values.password) errors.password = "Choose a password.";
  else if (values.password.length < 8) errors.password = "Must be at least 8 characters.";
  else if (byteLength(values.password) > 72) errors.password = "Password is too long (max 72 bytes).";

  if (!values.passwordConfirm) errors.passwordConfirm = "Re-enter your password.";
  else if (values.password !== values.passwordConfirm) errors.passwordConfirm = "Passwords do not match.";

  return errors;
}

export function validateLogin(values) {
  const errors = {};
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;
  if (!values.password) errors.password = "Enter your password.";
  return errors;
}

// FastAPI'nin 422 cevabındaki alan adlarını formdaki alanlara çevirir.
const FIELD_MAP = { name: "name", tax_id: "taxId", email: "email", home_address: "homeAddress", password: "password" };
export function mapServerErrors(detail) {
  if (!Array.isArray(detail)) return {};
  const errors = {};
  for (const item of detail) {
    const field = FIELD_MAP[item?.loc?.[item.loc.length - 1]];
    if (field && !errors[field]) errors[field] = "The server did not accept this value.";
  }
  return errors;
}
