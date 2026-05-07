// src/types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      role: string
      canUseSim: boolean
      canUseCalc: boolean
    } & DefaultSession["user"]
  }

  interface User {
    role: string
    canUseSim: boolean
    canUseCalc: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    canUseSim: boolean
    canUseCalc: boolean
  }
}