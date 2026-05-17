import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" as const },
  pages: {
    signIn: "/login",
    newUser: "/auth/role-select",
  },
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = (token.role as string) ?? "siswa";
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
