-- Migration 003: Auto-create profile on new auth user registration
-- Esta función se ejecuta como trigger AFTER INSERT en auth.users.
-- Actúa como red de seguridad: si el auth callback no puede crear el perfil
-- (por ejemplo, en registros directos via Supabase dashboard o Admin API),
-- el trigger lo crea automáticamente.
--
-- NOTA: El auth callback en /app/src/app/auth/callback/route.ts también crea
-- el perfil usando el admin client. Ambos usan ON CONFLICT (id) DO NOTHING,
-- por lo que son idempotentes y no se pisan entre sí.

-- ── Función ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(COALESCE(NEW.email, ''), '@', 1),
      'Usuario'
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(
      NEW.raw_user_meta_data->>'invited_role',
      'productor'
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ── Trigger ────────────────────────────────────────────────────────────────

-- Eliminar si ya existe (para poder re-ejecutar la migración)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ── Comentario ─────────────────────────────────────────────────────────────

COMMENT ON FUNCTION public.handle_new_auth_user() IS
  'Crea automáticamente un perfil en public.profiles cuando se registra un nuevo usuario en auth.users. Idempotente: usa ON CONFLICT DO NOTHING.';
