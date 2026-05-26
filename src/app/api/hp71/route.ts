// src/app/api/hp71/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let cmd = searchParams.get('cmd');

    if (cmd === null) {
      const body = await request.text();
      const params = new URLSearchParams(body);
      cmd = params.get('cmd');
    }

    if (cmd === null) {
      return NextResponse.json({ error: 'Falta el comando' }, { status: 400 });
    }

    // Reenvío usando el mismo contrato que HP71/web_ui/index.html.
    const backendUrl = process.env.HP71_BACKEND_URL ?? 'http://127.0.0.1:8080';
    const backendRes = await fetch(`${backendUrl}/input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `cmd=${encodeURIComponent(cmd)}`,
    });

    const text = await backendRes.text();

    if (!backendRes.ok) {
      console.error(`Backend HP71 respondió ${backendRes.status}:`, text);
      return NextResponse.json({
        display: text || `ERR: BACKEND ${backendRes.status}`,
      });
    }

    return NextResponse.json({ display: text });
  } catch (error) {
    console.error('Error en el proxy:', error);
    return NextResponse.json({ display: 'ERR: NO SERVER' }, { status: 200 });
  }
}
