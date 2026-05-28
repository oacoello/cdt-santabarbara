import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createLocalUser, listLocalUserProfiles } from "@/lib/local-auth-store";

function isSuperAdmin(role?: string | null) {
  return role === "SUPERADMIN";
}

export async function GET() {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const users = await listLocalUserProfiles();
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  const rank = String(body.rank ?? "Operador").trim() || "Operador";

  if (!username || !password) {
    return NextResponse.json({ error: "Usuario y contraseña son obligatorios" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const result = await createLocalUser({
    username,
    password,
    rank,
    canUseSim: Boolean(body.canUseSim),
    canUseCalc: Boolean(body.canUseCalc),
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
