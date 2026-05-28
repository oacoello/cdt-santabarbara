"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LocalProfile = {
  id: string;
  username: string;
  rank: string;
  role: string;
  canUseSim: boolean;
  canUseCalc: boolean;
};

type ProfileManagerProps = {
  enabled: boolean;
};

export function ProfileManager({ enabled }: ProfileManagerProps) {
  const [profiles, setProfiles] = useState<LocalProfile[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rank, setRank] = useState("Operador");
  const [canUseSim, setCanUseSim] = useState(true);
  const [canUseCalc, setCanUseCalc] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadProfiles = async () => {
    if (!enabled) return;
    const res = await fetch("/api/local-users", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setProfiles(data.users ?? []);
  };

  useEffect(() => {
    loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/local-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, rank, canUseSim, canUseCalc }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error ?? "No se pudo crear el perfil");
        return;
      }

      setUsername("");
      setPassword("");
      setRank("Operador");
      setCanUseSim(true);
      setCanUseCalc(true);
      setMessage("Perfil creado correctamente");
      await loadProfiles();
    } finally {
      setLoading(false);
    }
  };

  if (!enabled) return null;

  return (
    <div className="pt-6 border-t border-white/10 text-left space-y-4">
      <div className="text-center">
        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#F39C63]">Gestión de perfiles</h3>
        <p className="text-[10px] text-white/40 mt-1">Sólo se muestran usuarios y permisos. Las contraseñas no se revelan.</p>
      </div>

      <form onSubmit={handleCreate} className="grid gap-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[9px] uppercase font-bold text-white/50">Usuario</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="operador_01" className="bg-white/5 border-white/10 text-white" required />
          </div>
          <div className="space-y-1">
            <Label className="text-[9px] uppercase font-bold text-white/50">Contraseña</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mín. 8 caracteres" className="bg-white/5 border-white/10 text-white" required minLength={8} />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[9px] uppercase font-bold text-white/50">Rango</Label>
          <Input value={rank} onChange={(e) => setRank(e.target.value)} placeholder="Operador" className="bg-white/5 border-white/10 text-white" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] uppercase font-black text-white/70">
          <label className="flex items-center gap-2 rounded border border-white/10 bg-white/5 p-2">
            <input type="checkbox" checked={canUseSim} onChange={(e) => setCanUseSim(e.target.checked)} />
            Simulador
          </label>
          <label className="flex items-center gap-2 rounded border border-white/10 bg-white/5 p-2">
            <input type="checkbox" checked={canUseCalc} onChange={(e) => setCanUseCalc(e.target.checked)} />
            Calculadora
          </label>
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-[#F39C63] hover:bg-[#F39C63]/90 text-black font-black uppercase tracking-widest">
          {loading ? "Creando..." : "Crear perfil"}
        </Button>
        {message && <p className="text-center text-[11px] text-white/60">{message}</p>}
      </form>

      <div className="space-y-2 max-h-44 overflow-auto pr-1">
        {profiles.map((profile) => (
          <div key={profile.id} className="rounded border border-white/10 bg-black/25 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-white uppercase">{profile.username}</p>
              <p className="text-[10px] text-white/45 uppercase">{profile.rank} · {profile.role}</p>
            </div>
            <div className="text-right text-[9px] font-black uppercase text-white/55">
              <p className={profile.canUseSim ? "text-green-400" : "text-red-400"}>SIM {profile.canUseSim ? "ON" : "OFF"}</p>
              <p className={profile.canUseCalc ? "text-green-400" : "text-red-400"}>HP {profile.canUseCalc ? "ON" : "OFF"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
