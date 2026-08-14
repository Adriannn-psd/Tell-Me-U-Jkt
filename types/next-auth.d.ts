import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      discordId?: string;
      prodi?: string;
      fullName?: string;
      isVerified?: boolean;
      avatarUrl?: string;
      dbUsername?: string;
      kelas?: string;
      instagram?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    discordId?: string;
    accessToken?: string;
    prodi?: string;
    fullName?: string;
    isVerified?: boolean;
    avatarUrl?: string;
    dbUsername?: string;
    kelas?: string;
    instagram?: string;
  }
}
