import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client using service role key
// This bypasses RLS and should ONLY be used in server-side code (API routes, auth callbacks)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ---- User Data Helpers ----

export interface UserData {
  id?: string;
  discord_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  full_name?: string;
  prodi?: string;
  kelas?: string;
  instagram?: string;
  is_verified: boolean;
  role_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

export async function getUser(discordId: string): Promise<UserData | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("discord_id", discordId)
    .single();

  if (error || !data) return null;
  return data as UserData;
}

export async function upsertUser(userData: Partial<UserData> & { discord_id: string }) {
  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        ...userData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "discord_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Supabase upsert error:", error);
    return null;
  }
  return data as UserData;
}

export async function updateUserFullName(discordId: string, fullName: string) {
  const { data, error } = await supabase
    .from("users")
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq("discord_id", discordId)
    .select()
    .single();

  if (error) {
    console.error("Supabase update error:", error);
    return null;
  }
  return data as UserData;
}

export async function verifyUser(
  discordId: string,
  fullName: string,
  username?: string,
  noReg?: string,
  prodi?: string
) {
  const updateData: any = {
    full_name: fullName,
    is_verified: true,
    sync_discord: false, // eksplisit false agar bot Discord sync task pick up & assign role
    updated_at: new Date().toISOString(),
  };
  
  if (prodi) {
    updateData.prodi = prodi;
  }

  const { data, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("discord_id", discordId)
    .select()
    .single();

  if (error) {
    console.error("Supabase verify error:", error);
    return null;
  }
  
  if (username && noReg) {
    const { error: regError } = await supabase
      .from("skl_registry")
      .upsert(
        { no_reg: noReg, username },
        { onConflict: "no_reg" }
      );
    if (regError) {
      console.error("Supabase skl_registry upsert error:", regError);
    }
  }

  return data as UserData;
}

export async function updateUserClass(discordId: string, kelas: string) {
  const { data, error } = await supabase
    .from("users")
    .update({ kelas, updated_at: new Date().toISOString() })
    .eq("discord_id", discordId)
    .select()
    .single();

  if (error) {
    console.error("Supabase update class error:", error);
    return null;
  }
  return data as UserData;
}

export async function updateUserInstagram(discordId: string, instagram: string) {
  const { data, error } = await supabase
    .from("users")
    .update({ instagram, updated_at: new Date().toISOString() })
    .eq("discord_id", discordId)
    .select()
    .single();

  if (error) {
    console.error("Supabase update instagram error:", error);
    return null;
  }
  return data as UserData;
}
