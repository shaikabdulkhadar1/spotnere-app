/**
 * Shared validation utilities for the vendor app.
 * Rules match the backend's express-validator constraints.
 */

const MAX_SHORT = 100;
const MAX_MEDIUM = 255;
const MAX_LONG = 2000;
const MAX_URL = 2048;
const PASSWORD_MIN = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d\s()-]*$/;
const POSTAL_RE = /^[\w\s-]*$/;
const URL_RE = /^https?:\/\/.+/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_RE = /^[\w.-]+@[\w]+$/;

// Strip ASCII control characters (matches backend stripLow)
const clean = (val) =>
  typeof val === "string"
    ? val.trim().replace(/[\x00-\x1F\x7F]/g, "")
    : val;

export const rules = {
  required: (value, label) =>
    !value || !String(value).trim() ? `${label} is required` : null,

  email: (value) => {
    const v = clean(value);
    if (!v) return "Email is required";
    if (!EMAIL_RE.test(v)) return "Please enter a valid email address";
    if (v.length > MAX_MEDIUM) return "Email is too long";
    return null;
  },

  password: (value) => {
    if (!value) return "Password is required";
    if (value.length < PASSWORD_MIN)
      return `Password must be at least ${PASSWORD_MIN} characters`;
    if (value.length > MAX_MEDIUM) return "Password is too long";
    return null;
  },

  confirmPassword: (value, password) => {
    if (!value) return "Please confirm your password";
    if (value !== password) return "Passwords do not match";
    return null;
  },

  phone: (value, label = "Phone number") => {
    const v = clean(value);
    if (!v) return `${label} is required`;
    if (!PHONE_RE.test(v)) return `${label} contains invalid characters`;
    if (v.length > 20) return `${label} is too long`;
    return null;
  },

  phoneOptional: (value, label = "Phone number") => {
    const v = clean(value);
    if (!v) return null;
    if (!PHONE_RE.test(v)) return `${label} contains invalid characters`;
    if (v.length > 20) return `${label} is too long`;
    return null;
  },

  shortStr: (value, label) => {
    const v = clean(value);
    if (!v) return `${label} is required`;
    if (v.length > MAX_SHORT) return `${label} too long (max ${MAX_SHORT} characters)`;
    return null;
  },

  shortStrOptional: (value, label) => {
    const v = clean(value);
    if (!v) return null;
    if (v.length > MAX_SHORT) return `${label} too long (max ${MAX_SHORT} characters)`;
    return null;
  },

  medStr: (value, label) => {
    const v = clean(value);
    if (!v) return `${label} is required`;
    if (v.length > MAX_MEDIUM) return `${label} too long (max ${MAX_MEDIUM} characters)`;
    return null;
  },

  medStrOptional: (value, label) => {
    const v = clean(value);
    if (!v) return null;
    if (v.length > MAX_MEDIUM) return `${label} too long (max ${MAX_MEDIUM} characters)`;
    return null;
  },

  longStr: (value, label) => {
    const v = clean(value);
    if (!v) return `${label} is required`;
    if (v.length > MAX_LONG) return `${label} too long (max ${MAX_LONG} characters)`;
    return null;
  },

  url: (value, label = "URL") => {
    const v = clean(value);
    if (!v) return `${label} is required`;
    if (!URL_RE.test(v)) return `${label} must start with http:// or https://`;
    if (v.length > MAX_URL) return `${label} is too long`;
    return null;
  },

  urlOptional: (value, label = "URL") => {
    const v = clean(value);
    if (!v) return null;
    if (!URL_RE.test(v)) return `${label} must start with http:// or https://`;
    if (v.length > MAX_URL) return `${label} is too long`;
    return null;
  },

  postalCode: (value) => {
    const v = clean(value);
    if (!v) return "Postal code is required";
    if (!POSTAL_RE.test(v)) return "Postal code contains invalid characters";
    if (v.length > 20) return "Postal code is too long";
    return null;
  },

  price: (value, label = "Price") => {
    if (!value && value !== 0) return `${label} is required`;
    const n = parseFloat(value);
    if (isNaN(n) || n < 0) return `${label} must be a valid positive number`;
    if (n > 999999) return `${label} is too high (max 999,999)`;
    return null;
  },

  ifsc: (value) => {
    const v = clean(value);
    if (!v) return "IFSC code is required";
    if (!IFSC_RE.test(v.toUpperCase()))
      return "Please enter a valid IFSC code (e.g., ABCD0123456)";
    return null;
  },

  upi: (value) => {
    const v = clean(value);
    if (!v) return "UPI ID is required";
    if (!UPI_RE.test(v)) return "Please enter a valid UPI ID (e.g., name@paytm)";
    return null;
  },

  accountNumber: (value) => {
    const v = clean(value);
    if (!v) return "Account number is required";
    if (!/^\d+$/.test(v)) return "Account number must contain only numbers";
    if (v.length > MAX_MEDIUM) return "Account number is too long";
    return null;
  },
};

/**
 * Run a map of { fieldName: errorOrNull } and return only the errors.
 * Usage:
 *   const errs = collectErrors({
 *     email: rules.email(form.email),
 *     password: rules.password(form.password),
 *   });
 *   if (Object.keys(errs).length > 0) { setErrors(errs); return false; }
 */
export function collectErrors(checks) {
  const errs = {};
  for (const [field, msg] of Object.entries(checks)) {
    if (msg) errs[field] = msg;
  }
  return errs;
}
