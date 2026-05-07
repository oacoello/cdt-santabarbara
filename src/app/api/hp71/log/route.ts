// src/app/api/hp71/log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, content } = body;
    if (!type || !content) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const line = `[${timestamp}] ${type}: ${content}\n`;
    const logPath = path.join(process.cwd(), 'public', 'hp71_log.txt');
    fs.appendFileSync(logPath, line);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error escribiendo log:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}