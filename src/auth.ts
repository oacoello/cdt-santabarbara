// src/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { ensureLocalUsers, findLocalUserByUsername } from "@/lib/local-auth-store";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        await ensureLocalUsers();

        const user = await findLocalUserByUsername(credentials.username as string);
        if (!user?.password) return null;

        const isValid = await bcrypt.compare(credentials.password as string, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.username,
          role: user.role,
          canUseSim: user.canUseSim,
          canUseCalc: user.canUseCalc,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.canUseSim = user.canUseSim;
        token.canUseCalc = user.canUseCalc;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.canUseSim = token.canUseSim as boolean;
        session.user.canUseCalc = token.canUseCalc as boolean;
      }
      return session;
    },
  },
});
