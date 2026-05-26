'use server'

import bcrypt from "bcrypt"
import { ensureDatabase, prisma } from "@/lib/prisma"

export async function createOperator(formData: any) {
  const { username, password, rank, canUseCalc, canUseSim } = formData;
  await ensureDatabase();
  
  // Encrypt password before sending to the cluster
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: {
        username,
        email: `${username}@santabarbara.local`,
        password: hashedPassword,
        rank,
        canUseCalc,
        canUseSim,
        role: 'USER'
      }
    });
    return { success: true };
  } catch (e) {
    return { error: "Tactical ID already exists in the cluster." };
  }
}
