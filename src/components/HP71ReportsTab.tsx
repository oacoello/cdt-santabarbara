"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Hp71Log = {
  id: string;
  fileName: string;
  createdAt: string;
  updatedAt: string;
  size: number;
  entries: number;
  preview: string[];
};

type HP71ReportsTabProps = {
  userName?: string;
  currentSessionId?: string;
};

export function HP71ReportsTab({ userName, currentSessionId }: HP71ReportsTabProps) {
  const [logs, setLogs] = useState<Hp71Log[]>([]);
  const [loading, setLoading] = useState(false);
  const activeUser = userName || "sin-perfil";
  const currentSessionKey = currentSessionId?.toLowerCase();

  const loadLogs = async () => {
    if (!userName) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/hp71/log?user=${encodeURIComponent(activeUser)}`, { cache: "no-store" });
      const data = await res.json();
      setLogs(data.logs ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    const timer = setTimeout(loadLogs, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName, currentSessionId]);

  if (!userName) {
    return (
      <div className="h-full w-full flex items-center justify-center p-6">
        <Card className="p-8 bg-[#1a1a1a]/80 border-white/10 text-center max-w-md">
          <h2 className="text-[#F39C63] text-xs font-black uppercase tracking-[0.3em]">Reportes</h2>
          <p className="mt-3 text-sm text-white/60">Iniciá sesión para ver los logs de tu perfil.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto p-6 lg:p-10">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[#F39C63] text-xs font-black uppercase tracking-[0.3em]">Reportes</h2>
            <p className="text-sm text-white/50 mt-1">Historiales HP71 del perfil {activeUser}</p>
          </div>
          <Button onClick={loadLogs} disabled={loading} className="bg-[#F39C63] text-black hover:bg-[#F39C63]/90 font-black uppercase tracking-widest">
            {loading ? "Actualizando..." : "Actualizar"}
          </Button>
        </div>

        <div className="grid gap-3">
          {logs.length === 0 ? (
            <Card className="p-6 bg-[#1a1a1a]/75 border-white/10 text-white/55">
              Todavía no hay logs para este perfil.
            </Card>
          ) : logs.map((log) => {
            const isCurrent = log.id === currentSessionKey;
            return (
              <Card key={log.id} className={`p-4 bg-[#1a1a1a]/75 border ${isCurrent ? "border-[#F39C63]/70" : "border-white/10"}`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-black text-sm truncate">{log.fileName}</span>
                      {isCurrent && <span className="text-[9px] px-2 py-0.5 rounded bg-[#F39C63] text-black font-black uppercase">Actual</span>}
                    </div>
                    <p className="text-[11px] text-white/45 mt-1">
                      {new Date(log.createdAt).toLocaleString()} · {log.entries} entradas · {log.size} bytes
                    </p>
                    {log.preview.length > 0 && (
                      <pre className="mt-3 whitespace-pre-wrap text-[11px] leading-relaxed text-[#BAFF7C]/80 bg-black/35 rounded p-3 border border-white/5">
                        {log.preview.join("\n")}
                      </pre>
                    )}
                  </div>
                  <a
                    href={`/api/hp71/log?user=${encodeURIComponent(activeUser)}&sessionId=${encodeURIComponent(log.id)}`}
                    target="_blank"
                    className="shrink-0 h-10 px-4 rounded-xl border-2 border-[#F39C63] text-[#F39C63] hover:bg-[#F39C63] hover:text-black transition-all flex items-center justify-center text-[10px] font-black uppercase tracking-[0.18em]"
                  >
                    Abrir
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
