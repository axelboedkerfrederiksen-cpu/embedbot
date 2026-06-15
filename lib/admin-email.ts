const ADMIN_EMAIL_MISSING_ERROR = "Serveren mangler ADMIN_EMAIL.";
const ADMIN_EMAIL_INVALID_ERROR = "ADMIN_EMAIL er ugyldig. Forventet en gyldig email-adresse.";

function isValidEmail(value: string) {
  // Intentionally simple check to avoid accepting obvious invalid env values.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getAdminEmailOrThrow() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    throw new Error(ADMIN_EMAIL_MISSING_ERROR);
  }

  if (!isValidEmail(adminEmail)) {
    throw new Error(ADMIN_EMAIL_INVALID_ERROR);
  }

  return adminEmail;
}

export function isAdminEmailEnvErrorMessage(message: string) {
  return message === ADMIN_EMAIL_MISSING_ERROR || message === ADMIN_EMAIL_INVALID_ERROR;
}