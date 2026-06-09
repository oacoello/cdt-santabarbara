"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink, Trash2 } from "lucide-react";

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

  const deleteLog = async (id: string) => {
    if (!window.confirm("¿Borrar este historial HP71?")) return;
    await fetch(`/api/hp71/log?user=${encodeURIComponent(activeUser)}&sessionId=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await loadLogs();
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
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="flex items-start justify-between gap-4 px-4 md:px-8">
          <div>
            <h2 className="text-[#F39C63] text-xs font-black uppercase tracking-[0.28em]">Reportes</h2>
            <p className="mt-2 text-base font-black text-white/55">
              Historiales HP71 del perfil {activeUser}
              {currentSessionKey && <span className="ml-2 text-[#F39C63]">▰</span>}
            </p>
          </div>
          <Button
            onClick={loadLogs}
            disabled={loading}
            className="h-14 rounded-md bg-[#F39C63] px-8 text-base font-black uppercase tracking-wide text-[#171717] hover:bg-[#F39C63]/90"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </Button>
        </div>

        <div className="space-y-5">
          {logs.length === 0 ? (
            <Card className="mx-4 border-2 border-[#F39C63] bg-[#0A0A0E]/70 p-8 text-white/55 md:mx-8">
              Todavía no hay logs para este perfil.
            </Card>
          ) : logs.map((log) => {
            const isCurrent = log.id === currentSessionKey;
            return (
              <Card
                key={log.id}
                className="mx-4 rounded-lg border-2 border-[#F39C63] bg-[#0A0A0E]/70 p-6 shadow-[0_20px_55px_rgba(0,0,0,0.45)] md:mx-8"
              >
                <div className="grid gap-6 lg:grid-cols-[1fr_180px] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="truncate text-2xl font-medium tracking-tight text-white">
                        {log.fileName}
                      </h3>
                      {isCurrent && (
                        <span className="rounded bg-[#F39C63] px-2 py-1 text-[10px] font-black uppercase text-[#171717]">
                          Actual
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-base font-semibold text-white/50">
                      {new Date(log.createdAt).toLocaleString()} · {log.entries} entradas · {log.size} bytes
                    </p>
                    {log.preview.length > 0 && (
                      <pre className="mt-4 max-h-36 overflow-hidden rounded border border-white/25 bg-black/25 px-5 py-4 font-mono text-2xl leading-tight text-[#BAFF7C]">{log.preview.join("\n")}</pre>
                    )}
                  </div>

                  <div className="flex flex-row gap-4 lg:flex-col lg:items-stretch">
                    <a
                      href={`/api/hp71/log?user=${encodeURIComponent(activeUser)}&sessionId=${encodeURIComponent(log.id)}`}
                      target="_blank"
                      className="flex h-12 flex-1 items-center justify-between rounded-lg border-2 border-[#F39C63] px-4 text-base font-black uppercase tracking-wide text-[#F39C63] transition hover:bg-[#F39C63] hover:text-[#171717]"
                    >
                      Abrir
                      <ExternalLink className="h-6 w-6" />
                    </a>
                    <button
                      type="button"
                      onClick={() => deleteLog(log.id)}
                      className="flex h-12 flex-1 items-center justify-between rounded-md bg-[#FF7D73] px-4 text-base font-black uppercase tracking-wide text-[#171717] transition hover:bg-[#FF7D73]/90"
                    >
                      Borrar
                      <Trash2 className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
