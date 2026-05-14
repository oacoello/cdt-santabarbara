// src/app/api/hp71/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cmd = searchParams.get('cmd');

    if (!cmd) {
      return NextResponse.json({ error: 'Falta el comando' }, { status: 400 });
    }

    // Reenvío directo al servidor real
    const backendUrl = process.env.HP71_BACKEND_URL ?? 'http://127.0.0.1:8080';
    const backendRes = await fetch(`${backendUrl}/input?cmd=${encodeURIComponent(cmd)}`, {
      method: 'POST',
    });

    if (!backendRes.ok) {
      throw new Error(`Backend respondió con ${backendRes.status}`);
    }

    const text = await backendRes.text();
    return NextResponse.json({ display: text });
  } catch (error) {
    console.error('Error en el proxy:', error);
    return NextResponse.json({ display: 'ERR: NO SERVER' }, { status: 200 });
  }
}