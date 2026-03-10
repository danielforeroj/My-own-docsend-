import "server-only";

import { redirect } from "next/navigation";
import { createClientOrNull } from "@/lib/supabase/server";
import { createAdminClientOrNull } from "@/lib/supabase/admin";
import type { AppRole } from "@/lib/db/types";
import { isDemoMode, isSupabaseConfigured } from "@/lib/runtime";

export type AuthContext = {
  userId: string;
  organizationId: string;
  role: AppRole;
};

const demoContext: AuthContext = {
  userId: "demo-admin",
  organizationId: "demo-org",
  role: "super_admin"
};

async function getMembershipContext(userId: string): Promise<Omit<AuthContext, "userId"> | null> {
  const supabase = createAdminClientOrNull();
  if (!supabase) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const row = membership as unknown as { organization_id: string; role: AppRole };

  return {
    organizationId: row.organization_id,
    role: row.role
  };
}

export async function requireAdminContext(): Promise<AuthContext> {
  if (isDemoMode()) {
    return demoContext;
  }

  if (!isSupabaseConfigured()) {
    redirect("/admin/login");
  }

  const supabase = await createClientOrNull();
  if (!supabase) return demoContext;

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
  if (isDemoMode()) {
    return demoContext;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClientOrNull();
  if (!supabase) return null;

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
