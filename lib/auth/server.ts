import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/db/types";
import { isDemoMode, isSupabaseConfigured } from "@/lib/runtime";

export type AuthContext = {
  userId: string;
  organizationId: string;
  role: AppRole;
  isDemo?: boolean;
};

const DEMO_CTX: AuthContext = {
  userId: "demo-user",
  organizationId: "demo-org",
  role: "super_admin",
  isDemo: true
};

async function getMembershipContext(userId: string): Promise<Omit<AuthContext, "userId"> | null> {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  return {
    organizationId: membership.organization_id,
    role: membership.role
  };
}

export async function requireAdminContext(): Promise<AuthContext> {
  if (isDemoMode() || !isSupabaseConfigured()) {
    return DEMO_CTX;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const membership = await getMembershipContext(user.id);

  if (!membership) {
    throw new Error("No organization membership found for this account.");
  }

  return {
    userId: user.id,
    ...membership
  };
}

export async function getAdminContextOrNull(): Promise<AuthContext | null> {
  if (isDemoMode() || !isSupabaseConfigured()) {
    return DEMO_CTX;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const membership = await getMembershipContext(user.id);
  if (!membership) return null;

  return {
    userId: user.id,
    ...membership
  };
}
