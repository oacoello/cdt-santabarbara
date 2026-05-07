'use server'

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

export async function createOperator(formData: any) {
  const { username, password, rank, canUseCalc, canUseSim } = formData;
  
  // Encrypt password before sending to the cluster
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: {
        username,
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