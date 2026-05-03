-- Migration 004: Asignar rol artista a BERTIAKA si ya tiene perfil
-- Si el perfil aún no existe (no se ha registrado todavía), esta migración
-- hace un no-op seguro — el trigger de migration_003 y el auth callback
-- se encargan de asignar el rol correcto al primer login.
--
-- Ejecutar DESPUÉS de que BERTIAKA se haya registrado por primera vez,
-- o en cualquier momento — es idempotente.

UPDATE public.profiles
SET
  role = 'artista',
  updated_at = now()
WHERE
  email = 'bertiakapartners@gmail.com'
  AND role != 'artista';

-- ── BONUS: Actualizar el trigger para que BERTIAKA siempre entre como artista
-- Reemplazar la función del migration_003 con una versión que conoce el email principal

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- El artista principal siempre entra como artista
  IF NEW.email = 'bertiakapartners@gmail.com' THEN
    v_role := 'artista';
  ELSE
    -- Rol desde metadata de invitación, o default productor
    v_role := COALESCE(
      NEW.raw_user_meta_data->>'invited_role',
      'productor'
    );
  END IF;

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
    v_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
