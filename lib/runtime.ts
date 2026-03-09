const TRUTHY_VALUES = new Set(["1", "true", "yes", "on"]);

function isTruthy(value: string | undefined) {
  if (!value) return false;
  return TRUTHY_VALUES.has(value.toLowerCase());
}

export function isDemoMode() {
  return isTruthy(process.env.NEXT_PUBLIC_DEMO_MODE);
}

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL && process.env.LEAD_NOTIFICATION_EMAIL);
}
