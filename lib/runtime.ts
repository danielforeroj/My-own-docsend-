export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL && process.env.LEAD_NOTIFICATION_EMAIL);
}

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !isSupabaseConfigured();
}

export function isBackendEnabled() {
  return isSupabaseConfigured() && !isDemoMode();
}
