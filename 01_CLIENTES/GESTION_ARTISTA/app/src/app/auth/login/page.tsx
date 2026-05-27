import { createAdminSupabaseClient } from "@/lib/supabase/server";
import LoginContentWrapper from "./LoginContent";

export default async function LoginPage() {
  let studioName = "Studio";
  try {
    const supabase = createAdminSupabaseClient();
    const { data } = await supabase
      .from("profiles")
      .select("studio_name")
      .eq("is_deleted", false)
      .not("studio_name", "is", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (data?.studio_name) studioName = data.studio_name;
  } catch {
    // Use default — column may not exist yet or no profiles
  }

  return <LoginContentWrapper studioName={studioName} />;
}
