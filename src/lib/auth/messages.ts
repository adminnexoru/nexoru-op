// User-facing auth messages in Spanish (FR-006, FR-031). None of them reveals whether an
// email is registered.
export const MESSAGES = {
  badCredentials: "Correo o contraseña incorrectos.",
  locked: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  untrustedConnection: "No pudimos verificar tu conexión. Inténtalo de nuevo más tarde.",
  badCode: "Código incorrecto.",
  unexpected: "Algo salió mal. Inténtalo de nuevo.",
  invalidInvitation: "Pide una invitación nueva a tu administrador.",
  passwordMismatch: "Las contraseñas no coinciden.",
  weakPassword: "La contraseña debe tener al menos 12 caracteres y no puede ser una contraseña filtrada en internet.",
} as const;

export const SESSION_REASONS: Record<string, string> = {
  idle: "Tu sesión se cerró por inactividad.",
  max_age: "Tu sesión llegó a su duración máxima. Vuelve a iniciar sesión.",
  inactive_user: "Tu cuenta no está activa.",
};
