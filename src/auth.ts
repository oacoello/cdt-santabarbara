// src/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { ensureDatabase, prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" }, // Optimizado para la velocidad de la interfaz táctica
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        email: { label: "Correo Electrónico", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        await ensureDatabase();

        // Búsqueda del operador en la base de datos del clúster
        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        });

        if (!user || !user.password) return null;

        // Validación de seguridad mediante comparación de hashes
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        // Retorno del perfil con sus permisos de acceso a herramientas
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
    // Inyectamos los permisos en el token JWT para persistencia
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.canUseSim = user.canUseSim;
        token.canUseCalc = user.canUseCalc;
      }
      return token;
    },
    // Sincronizamos la sesión con los permisos del clúster
    async session({ session, token }) {
    if (session.user) {
      session.user.role = token.role as string;
      session.user.canUseSim = token.canUseSim as boolean;
      session.user.canUseCalc = token.canUseCalc as boolean; // Agrega esta línea
    }
    return session;
    },
  },
});
