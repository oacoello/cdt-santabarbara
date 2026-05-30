// app/api/hp71/key/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const key = params.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Falta el parámetro key' }, { status: 400 });
    }

    const backendUrl = process.env.HP71_BACKEND_URL ?? 'http://127.0.0.1:8080';
    const backendRes = await fetch(`${backendUrl}/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: key,
    });

    if (!backendRes.ok) {
      throw new Error(`Backend error ${backendRes.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al enviar tecla:', error);
    return NextResponse.json({ error: 'ERR: NO SERVER' }, { status: 500 });
  }
}
