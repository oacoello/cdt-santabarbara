import { NextResponse } from "next/server";

export async function GET() {
  try {
    const backendUrl = process.env.HP71_BACKEND_URL ?? "http://127.0.0.1:8080";
    const backendRes = await fetch(`${backendUrl}/record`, { cache: "no-store" });
    const text = await backendRes.text();

    if (!backendRes.ok) {
      return NextResponse.json({ error: text || `Backend HP71 respondió ${backendRes.status}` }, { status: 502 });
    }

    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error leyendo record de tiro HP71:", error);
    return NextResponse.json({ error: "ERR: NO SERVER" }, { status: 200 });
  }
}
