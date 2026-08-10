import { NextResponse } from "next/server";
import fs from "fs";
import type { AuthenticatedCdtProfile, CdtLaunchContext } from "@/lib/sb-access-session";
import {
  CDT_REQUIRED_PERMISSIONS,
  getCdtAuthBaseUrl,
  normalizeRole,
} from "@/lib/sb-access-session";

function readContextFromEnv(): CdtLaunchContext | null {
  const contextFile = process.env.CDT_SESSION_CONTEXT_FILE;
  if (contextFile && fs.existsSync(contextFile)) {
    const parsed = JSON.parse(fs.readFileSync(contextFile, "utf8")) as CdtLaunchContext;
    return parsed.applicationCode?.toLowerCase() === "cdt" ? parsed : null;
  }

  const sessionToken = process.env.CDT_SESSION_TOKEN;
  const deviceId = process.env.CDT_DEVICE_ID;
  const applicationCode = process.env.CDT_APPLICATION_CODE;
  if (!sessionToken || !deviceId || !applicationCode || applicationCode.toLowerCase() !== "cdt") return null;

  const profile = process.env.CDT_PROFILE_JSON
    ? JSON.parse(process.env.CDT_PROFILE_JSON)
    : undefined;

  return { sessionToken, deviceId, applicationCode, profile };
}

function buildProfile(
  context: CdtLaunchContext,
  validation: { 
    profileId?: string; 
    permissions?: Record<string, boolean>; 
    nombre?: string;
    username?: string;
    role?: string;
    profilePhotoPath?: string;
    profile?: any;
    user?: any;
  },
): AuthenticatedCdtProfile {
  const profileId = validation.profileId ?? context.profile?.profileId ?? "";
  const permissions = {
    ...(context.profile?.permissions ?? {}),
    ...(validation.permissions ?? {}),
  };

  // Buscar los datos en el objeto validation (en la raíz, en .profile o en .user)
  const username = validation.username ?? validation.profile?.username ?? validation.user?.username ?? context.profile?.username ?? profileId;
  const nombre = validation.nombre ?? validation.profile?.nombre ?? validation.user?.nombre ?? context.profile?.nombre ?? username ?? "Operador CDT";
  const roleRaw = validation.role ?? validation.profile?.role ?? validation.user?.role ?? context.profile?.role;
  const profilePhotoPath = validation.profilePhotoPath ?? validation.profile?.profilePhotoPath ?? validation.user?.profilePhotoPath ?? context.profile?.profilePhotoPath;

  return {
    profileId,
    username,
    nombre,
    role: normalizeRole(roleRaw),
    permissions,
    profilePhotoPath,
  };
}

export async function GET() {
  const context = readContextFromEnv();
  
  console.log("[CDT AUTH] Contexto recibido:", context);

  if (!context?.sessionToken || !context.deviceId || context.applicationCode?.toLowerCase() !== "cdt") {
    console.error("[CDT AUTH] Bloqueado. Razón: faltan credenciales o el applicationCode no es 'cdt'. Env:", process.env.CDT_SESSION_TOKEN ? "Tiene token" : "Sin token");
    return NextResponse.json(
      { status: "blocked", reason: "Debe abrir CDT desde Servicios de Usuario Santa Barbara" },
      { status: 401 },
    );
  }

  try {
    const response = await fetch(`${getCdtAuthBaseUrl()}/auth/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: context.sessionToken,
        deviceId: context.deviceId,
        application: "cdt",
        requiredPermissions: CDT_REQUIRED_PERMISSIONS,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: "blocked", reason: "No se pudo validar la sesión contra cdt-auth" },
        { status: 401 },
      );
    }

    const validation = await response.json();
    if (!validation.valid || !validation.profileId) {
      return NextResponse.json(
        { status: "blocked", reason: "Sesión inválida o sin permisos para usar CDT" },
        { status: 401 },
      );
    }

    return NextResponse.json({
      status: "valid",
      profile: buildProfile(context, validation),
      sessionId: context.sessionId ?? validation.sessionId,
    });
  } catch (error) {
    console.error("Error validando sesión CDT:", error);
    return NextResponse.json(
      { status: "blocked", reason: "No se pudo conectar con cdt-auth" },
      { status: 401 },
    );
  }
}

