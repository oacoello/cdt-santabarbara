import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { getCdtAuthBaseUrl } from "@/lib/sb-access-session";

function readContextFile() {
  const file = process.env.CDT_SESSION_CONTEXT_FILE;
  if (!file || !fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8")) as { sessionToken?: string; deviceId?: string };
}

export async function POST(request: NextRequest) {
  const event = await request.json();
  const context = readContextFile();
  const sessionToken =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    process.env.CDT_SESSION_TOKEN ??
    context.sessionToken;
  const deviceId = request.headers.get("x-device-id") ?? process.env.CDT_DEVICE_ID ?? context.deviceId;

  if (!sessionToken || !deviceId) {
    return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  }

  try {
    const response = await fetch(`${getCdtAuthBaseUrl()}/application-events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${sessionToken}`,
        "x-device-id": deviceId,
      },
      body: JSON.stringify(event),
    });

    if (response.status === 404) {
      console.warn("cdt-auth todavía no expone /application-events; evento CDT omitido.", event);
      return NextResponse.json({ queued: false, skipped: true });
    }

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: text || "No se pudo reportar evento" }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reportando evento de aplicación:", error);
    return NextResponse.json({ queued: false, skipped: true });
  }
}

