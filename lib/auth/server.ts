import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/db/types";

export type AuthContext = {
  userId: string;
  organizationId: string;
  role: AppRole;
};

export async function requireAdminContext(): Promise<AuthContext> {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    throw new Error("No organization membership found for this account.");
  }

  return {
    userId: user.id,
    organizationId: membership.organization_id,
    role: membership.role
  };
}
