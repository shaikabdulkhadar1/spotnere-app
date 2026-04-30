/**
 * Shared validation utilities for the user app.
 * Rules match the backend's express-validator constraints.
 */

const MAX_SHORT = 100;
const MAX_MEDIUM = 255;
const MAX_LONG = 2000;
const PASSWORD_MIN = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d\s()-]*$/;
const POSTAL_RE = /^[\w\s-]*$/;

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

  shortStr: (value, label) => {
    const v = clean(value);
    if (!v) return `${label} is required`;
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

  postalCode: (value) => {
    const v = clean(value);
    if (!v) return "Postal code is required";
    if (!POSTAL_RE.test(v)) return "Postal code contains invalid characters";
    if (v.length > 20) return "Postal code is too long";
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
