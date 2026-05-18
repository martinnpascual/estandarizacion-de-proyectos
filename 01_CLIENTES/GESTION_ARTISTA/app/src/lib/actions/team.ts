"use server";

import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { z } from "zod";
import type { Profile, TeamInvitation, UserRole } from "@/types/database";

export const InviteSchema = z.object({
  email: z.string().email("Email inválido"),
  role: z.enum(["productor", "manager"]),
});

export type InviteFormData = z.infer<typeof InviteSchema>;

export async function getTeamMembers(): Promise<{
  data: Profile[] | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_deleted", false)
    .order("role", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: data as Profile[], error: null };
}

export async function getPendingInvitations(): Promise<{
  data: TeamInvitation[] | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("accepted", false)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: data as TeamInvitation[], error: null };
}

export async function inviteTeamMember(
  formData: InviteFormData
): Promise<{ data: TeamInvitation | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const adminClient = createServiceRoleClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const parsed = InviteSchema.safeParse(formData);
  if (!parsed.success) return { data: null, error: parsed.error.errors[0].message };

  // No invitar al artista principal a sí mismo
  if (parsed.data.email.toLowerCase() === user.email?.toLowerCase()) {
    return { data: null, error: "No podés invitarte a vos mismo" };
  }

  // Verificar si ya fue invitado (pendiente o aceptado)
  const { data: existing } = await adminClient
    .from("team_invitations")
    .select("id, accepted")
    .eq("email", parsed.data.email)
    .eq("is_deleted", false)
    .maybeSingle();

  if (existing) {
    if (existing.accepted) return { data: null, error: "Este email ya es miembro del equipo" };
    return { data: null, error: "Ya existe una invitación pendiente para este email" };
  }

  // Verificar si el email ya tiene un perfil activo (usuario registrado)
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("email", parsed.data.email)
    .eq("is_deleted", false)
    .maybeSingle();

  if (existingProfile) {
    // El usuario ya existe — actualizar su rol directamente y marcar como aceptado
    await adminClient
      .from("profiles")
      .update({ role: parsed.data.role, updated_at: new Date().toISOString() })
      .eq("id", existingProfile.id);

    const { data, error } = await adminClient
      .from("team_invitations")
      .insert({
        email: parsed.data.email,
        role: parsed.data.role,
        invited_by: user.id,
        accepted: true,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as TeamInvitation, error: null };
  }

  // Usuario nuevo — crear registro de invitación (with invite token, 72h expiry)
  const inviteToken = crypto.randomUUID();
  const tokenExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const { data: inviteRecord, error: dbError } = await adminClient
    .from("team_invitations")
    .insert({
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: user.id,
      invite_token: inviteToken,
      invite_token_expires_at: tokenExpiresAt,
    })
    .select()
    .single();

  if (dbError) return { data: null, error: dbError.message };

  // Enviar email de invitación via Supabase Auth Admin
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error: authInviteError } = await adminClient.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      redirectTo: `${appUrl}/auth/callback`,
      data: { invited_role: parsed.data.role },
    }
  );

  if (authInviteError) {
    // El registro quedó en la DB pero el email falló — no bloquear
    console.error("[inviteTeamMember] invite email failed:", authInviteError.message);
    return {
      data: inviteRecord as TeamInvitation,
      error: `Invitación guardada, pero el email no se pudo enviar: ${authInviteError.message}`,
    };
  }

  return { data: inviteRecord as TeamInvitation, error: null };
}

export async function revokeInvitation(id: string): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("team_invitations")
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}

// ─── Invite token helpers ──────────────────────────────────────────────────────

/**
 * Regenerate (or return existing) invite token for a pending invitation.
 * Returns the full URL the artist can copy and share.
 */
export async function refreshInviteToken(invitationId: string): Promise<{
  url: string | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { url: null, error: "No autenticado" };

  const admin = createServiceRoleClient();

  const newToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const { error } = await admin
    .from("team_invitations")
    .update({
      invite_token: newToken,
      invite_token_expires_at: expiresAt,
    })
    .eq("id", invitationId)
    .eq("accepted", false)
    .eq("is_deleted", false);

  if (error) return { url: null, error: error.message };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { url: `${appUrl}/invite/${newToken}`, error: null };
}

/**
 * Public lookup: fetch invite info by token (no auth required).
 * Returns only the fields needed to render the /invite/[token] page.
 */
export async function getInviteByToken(token: string): Promise<{
  data: {
    email: string;
    role: string;
    expires_at: string | null;
    is_expired: boolean;
  } | null;
  error: string | null;
}> {
  // Use the service-role client so unauthenticated visitors can read the row
  const admin = createServiceRoleClient();

  const { data, error } = await admin
    .from("team_invitations")
    .select("email, role, invite_token_expires_at, accepted, is_deleted")
    .eq("invite_token", token)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Invitación no encontrada" };
  if (data.accepted) return { data: null, error: "Esta invitación ya fue aceptada" };
  if (data.is_deleted) return { data: null, error: "Esta invitación fue revocada" };

  const expiresAt = data.invite_token_expires_at;
  const is_expired = expiresAt ? new Date(expiresAt) < new Date() : false;

  return {
    data: {
      email: data.email,
      role: data.role,
      expires_at: expiresAt,
      is_expired,
    },
    error: null,
  };
}

export async function updateMemberRole(
  memberId: string,
  role: UserRole
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", memberId);

  if (error) return { error: error.message };
  return { error: null };
}
