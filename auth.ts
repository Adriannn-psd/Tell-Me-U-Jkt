import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { getUser, upsertUser, supabase } from "@/lib/supabase";

// ---- Role ID → Prodi Mapping ----
// Ganti ROLE_ID_xxx dengan Role ID asli dari server Discord kamu
const ROLE_TO_PRODI: Record<string, string> = {
  "1538489249895292951": "Informatika",
  "1526566212077879438": "Teknologi Informasi",
  "1526566441040478352": "Sistem Informasi",
  "1526565350731284532": "Desain Komunikasi Visual",
  "1526566818024783872": "Teknik Telekomunikasi",
};

const GUILD_ID = "1522059025485664326";

function getProdiFromRoles(roleIds: string[]): string | undefined {
  for (const roleId of roleIds) {
    if (ROLE_TO_PRODI[roleId]) {
      return ROLE_TO_PRODI[roleId];
    }
  }
  return undefined;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      authorization: "https://discord.com/api/oauth2/authorize?scope=identify+guilds.members.read",
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account?.access_token) return false;

      try {
        // Check if user is a member of the required Discord server
        const memberRes = await fetch(
          `https://discord.com/api/v10/users/@me/guilds/${GUILD_ID}/member`,
          {
            headers: { Authorization: `Bearer ${account.access_token}` },
          }
        );

        if (!memberRes.ok) {
          // User is NOT a member of the server
          return "/login?error=NotInServer";
        }

        const memberData = await memberRes.json();
        const roleIds: string[] = memberData.roles || [];
        const prodi = getProdiFromRoles(roleIds);

        // Build avatar URL
        const discordId = account.providerAccountId;
        const avatarUrl =
          user.image || `https://cdn.discordapp.com/embed/avatars/${parseInt(discordId) % 5}.png`;

        // Fetch existing user to preserve verification status
        const existingUser = await getUser(discordId);

        // Actual Discord username from profile (e.g. "bella_rawrr" instead of "Bella Rawr 💕")
        const rawDiscordUsername = (profile as any)?.username || user.name || "";

        // ── Bot Integration: Check if user was already verified via Discord bot ──
        // The bot stores verified users in `maba_roles` (username, role_name, full_name)
        // If found, we auto-verify them on the web so they don't need to upload SKL again.
        let botVerified = existingUser?.is_verified || false;
        let botProdi = prodi; // default from Discord role IDs
        let botFullName: string | undefined = undefined;

        if (!botVerified) {
          const { data: botRecord } = await supabase
            .from("maba_roles")
            .select("role_name, full_name")
            .eq("username", rawDiscordUsername)
            .maybeSingle();

          // Hanya auto-verify jika bot sudah mengekstrak full_name
          if (botRecord && botRecord.full_name) {
            botVerified = true;
            // Map bot's short role names to full prodi names used by the web
            const BOT_ROLE_TO_PRODI: Record<string, string> = {
              "DKV": "Desain Komunikasi Visual",
              "TI": "Teknologi Informasi",
              "INFOR": "Informatika",
              "SISFOR": "Sistem Informasi",
              "TEKTEL": "Teknik Telekomunikasi",
            };
            botProdi = BOT_ROLE_TO_PRODI[botRecord.role_name] || prodi;
            botFullName = botRecord.full_name;
            console.log(`✅ Bot-verified user detected: ${rawDiscordUsername} → ${botRecord.role_name}, name: ${botFullName}`);
          } else if (botRecord && !botRecord.full_name) {
            console.log(`⚠️ User ${rawDiscordUsername} verified di bot tapi belum ada nama lengkap. Harus upload SKL ulang di web.`);
          }
        }

        let finalAvatarUrl = avatarUrl;
        if (existingUser?.avatar_url && !existingUser.avatar_url.includes("cdn.discordapp.com")) {
          finalAvatarUrl = existingUser.avatar_url;
        }

        // Upsert user to Supabase
        await upsertUser({
          discord_id: discordId,
          username: rawDiscordUsername,
          display_name: user.name || undefined,
          avatar_url: finalAvatarUrl,
          prodi: botProdi,
          role_ids: roleIds,
          is_verified: botVerified,
          // Use bot-extracted full name if available, otherwise keep existing
          ...(botFullName ? { full_name: botFullName } : {}),
        });

        return true;
      } catch (error) {
        console.error("Error during sign in:", error);
        return "/login?error=ServerError";
      }
    },

    async jwt({ token, account, user }) {
      // On initial sign in, store Discord ID in token
      if (account && user) {
        token.discordId = account.providerAccountId;
        token.accessToken = account.access_token;
      }

      // Fetch latest user data from Supabase
      if (token.discordId) {
        const dbUser = await getUser(token.discordId as string);
        if (dbUser) {
          token.prodi = dbUser.prodi;
          token.fullName = dbUser.full_name;
          token.isVerified = dbUser.is_verified;
          token.avatarUrl = dbUser.avatar_url;
          token.dbUsername = dbUser.username;
          token.kelas = dbUser.kelas;
          token.instagram = dbUser.instagram;
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Forward custom fields from token to session
      session.user.discordId = token.discordId as string;
      session.user.prodi = token.prodi as string | undefined;
      session.user.fullName = token.fullName as string | undefined;
      session.user.isVerified = (token.isVerified as boolean) || false;
      session.user.avatarUrl = token.avatarUrl as string | undefined;
      session.user.dbUsername = token.dbUsername as string | undefined;
      session.user.kelas = token.kelas as string | undefined;
      session.user.instagram = token.instagram as string | undefined;
      return session;
    },
  },
});
