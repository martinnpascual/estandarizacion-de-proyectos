import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const adminClient = createServiceRoleClient();
        const userEmail = user.email ?? "";

        // ── 1. Verificar si hay una invitación pendiente para este email ──────
        const { data: invitation } = await adminClient
          .from("team_invitations")
          .select("id, role")
          .eq("email", userEmail)
          .eq("accepted", false)
          .eq("is_deleted", false)
          .maybeSingle();

        // Rol: viene de invitación > metadata del invite > default productor
        const role =
          invitation?.role ??
          (user.user_metadata?.invited_role as string | undefined) ??
          "productor";

        // ── 2. Upsert del perfil con admin client (evita problemas de RLS en INSERT) ──
        // ignoreDuplicates: true → si ya existe no sobreescribe role ni full_name
        await adminClient.from("profiles").upsert(
          {
            id: user.id,
            email: userEmail,
            full_name:
              user.user_metadata?.full_name ||
              userEmail.split("@")[0] ||
              "Usuario",
            avatar_url: user.user_metadata?.avatar_url || null,
            role,
          },
          { onConflict: "id", ignoreDuplicates: true }
        );

        // ── 3. Marcar invitación como aceptada (si existe) ───────────────────
        if (invitation) {
          await adminClient
            .from("team_invitations")
            .update({ accepted: true })
            .eq("id", invitation.id);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Error en el intercambio de código → volver al login
  return NextResponse.redirect(`${origin}/auth/login`);
}
