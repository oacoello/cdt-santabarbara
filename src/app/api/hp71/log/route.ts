// src/app/api/hp71/log/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCdtDataDir } from "@/lib/local-auth-store";

function safeSegment(value: string | null | undefined, fallback: string) {
  const clean = (value || fallback).trim().toLowerCase().replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "");
  return clean || fallback;
}

function getUserLogDir(user: string) {
  const dir = path.join(getCdtDataDir(), "hp71-logs", safeSegment(user, "sin-perfil"));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getLogPath(user: string, sessionId: string) {
  return path.join(getUserLogDir(user), `${safeSegment(sessionId, "session")}.log`);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = safeSegment(searchParams.get("user"), "sin-perfil");
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      const logPath = getLogPath(user, sessionId);
      const content = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";
      return new NextResponse(content, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `inline; filename="${safeSegment(sessionId, "session")}.log"`,
        },
      });
    }

    const dir = getUserLogDir(user);
    const logs = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".log"))
      .map((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, "utf8");
        const lines = content.trim().split(/\r?\n/).filter(Boolean);

        return {
          id: file.replace(/\.log$/i, ""),
          fileName: file,
          createdAt: stat.birthtime.toISOString(),
          updatedAt: stat.mtime.toISOString(),
          size: stat.size,
          entries: lines.length,
          preview: lines.slice(-3),
        };
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error leyendo logs HP71:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, content, user, sessionId } = body;
    if (!type || !content) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
    const line = `[${timestamp}] ${type}: ${content}\n`;
    fs.appendFileSync(getLogPath(user, sessionId), line, "utf8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error escribiendo log:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = safeSegment(searchParams.get("user"), "sin-perfil");
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Falta sessionId" }, { status: 400 });
    }

    const logPath = getLogPath(user, sessionId);
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error borrando log HP71:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
