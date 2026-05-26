"use server";

import { createLocalUser } from "@/lib/local-auth-store";

export async function createOperator(formData: any) {
  const { username, password, rank, canUseCalc, canUseSim } = formData;

  return createLocalUser({
    username,
    password,
    rank,
    canUseCalc,
    canUseSim,
  });
}
