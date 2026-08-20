import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client using service role key
// This bypasses RLS and should ONLY be used in server-side code (API routes, auth callbacks)
// Placeholders keep `next build` working when no secrets are present (the Docker
// image is built without .env; real values arrive at runtime via env_file).
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing — " +
      "falling back to placeholders. Expected during build, NOT at runtime."
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy";

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

/**
 * Klaim no_reg SKL untuk satu Discord ID.
 *
 * Dulu ini `upsert({ no_reg, username }, { onConflict: "no_reg" })` — upsert buta
 * begitu bisa menimpa pemilik lama, jadi sekarang ditulis eksplisit dan diikat ke
 * `discord_id` (username Discord bisa diganti kapan saja). Baris warisan yang
 * `discord_id`-nya masih NULL hanya bisa diisi oleh pemilik sah, yaitu yang
 * username-nya masih cocok.
 */
async function claimSklRegistry(no_reg: string, username: string, discordId: string) {
  const { data: existing, error: selectError } = await supabase
    .from("skl_registry")
    .select("no_reg, username, discord_id")
    .eq("no_reg", no_reg)
    .maybeSingle();

  if (selectError) {
    console.error("Supabase skl_registry select error:", selectError);
    return;
  }

  if (!existing) {
    const { error } = await supabase
      .from("skl_registry")
      .insert({ no_reg, username, discord_id: discordId });
    if (error) console.error("Supabase skl_registry insert error:", error);
    return;
  }

  const isOwner = existing.discord_id
    ? existing.discord_id === discordId
    : existing.username?.toLowerCase() === username.toLowerCase();

  if (!isOwner) {
    // Route verify sudah menolak lebih dulu; kalau sampai ke sini berarti ada
    // jalur lain yang bocor — jangan tulis apa pun, cukup catat.
    console.error(
      `[skl_registry] no_reg ${no_reg} milik ${existing.discord_id || existing.username}, ` +
        `bukan ${discordId}. Penulisan dibatalkan.`
    );
    return;
  }

  const { error } = await supabase
    .from("skl_registry")
    .update({ username, discord_id: discordId })
    .eq("no_reg", no_reg);
  if (error) console.error("Supabase skl_registry update error:", error);
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
    await claimSklRegistry(noReg, username, discordId);
  }

  return data as UserData;
}

/**
 * Kunci kelas user. Kelas bersifat PATEN: sekali terisi tidak bisa diganti,
 * termasuk oleh user itu sendiri lewat reset akun.
 *
 * `.is("kelas", null)` adalah guard-nya — kalau kolomnya sudah terisi, update
 * mengenai 0 baris dan fungsi ini balik `null`, jadi double-submit atau dua tab
 * tidak bisa saling menimpa tanpa perlu transaksi.
 *
 * `sync_kelas: false` memicu loop `sync_web_kelas` di bot Discord untuk membuat
 * /menemukan role kelas dan memasangnya — pola yang sama dengan `sync_discord`.
 */
export async function lockUserClass(discordId: string, kelas: string) {
  const { data, error } = await supabase
    .from("users")
    .update({ kelas, sync_kelas: false, updated_at: new Date().toISOString() })
    .eq("discord_id", discordId)
    .is("kelas", null)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Supabase lock class error:", error);
    return { user: null, alreadyLocked: false };
  }

  // 0 baris = kelas sudah pernah diisi (atau user tidak ada)
  if (!data) return { user: null, alreadyLocked: true };

  return { user: data as UserData, alreadyLocked: false };
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
