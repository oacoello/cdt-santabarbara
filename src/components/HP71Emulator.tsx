"use client";

import React, { useState, useEffect, useCallback } from "react";

// ---------- Funciones auxiliares ----------
function extractBasePiece(text: string): number | null {
  const match = text.match(/BASE PIECE \(P \*\): (\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function isAskingForBasePiece(text: string): boolean {
  return text.includes("BASE PIECE");
}

// ---------- Tipado de teclas ----------
type KeyColor = "dark" | "light" | "yellow" | "blue";

interface KeyProps {
  label: string;
  data: string;
  color?: KeyColor;
  className?: string;
  onClick: (data: string) => void;
}

// ---------- Subcomponente de botón ----------
const KeyButton: React.FC<KeyProps> = ({
  label,
  data,
  color = "dark",
  className = "",
  onClick,
}) => {
  const base =
    "w-[55px] h-[42px] border-none rounded-md text-[15px] font-semibold cursor-pointer select-none transition-transform active:scale-95";
  const colorClasses: Record<KeyColor, string> = {
    dark: "bg-[#2b2b2b] text-white hover:bg-[#3e3e3e]",
    light: "bg-[#d7d7d7] text-black hover:bg-[#e5e5e5]",
    yellow: "bg-[#e6c200] text-black hover:bg-[#f5d600]",
    blue: "bg-[#4da6c8] text-white hover:bg-[#6bb8d4]",
  };

  return (
    <button
      className={`${base} ${colorClasses[color]} ${className}`}
      onClick={() => onClick(data)}
    >
      {label}
    </button>
  );
};

// ---------- Utilidad: detectar piezas en la respuesta ----------
function parsePieces(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const result: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    const clean = line.trim();

    if (clean.includes("PIECE") && clean.includes("-----")) {
      if (current.length > 0) {
        result.push(current.join("\n"));
      }
      current = [clean];
      continue;
    }

    if (current.length > 0) {
      if (clean.startsWith("COMP CORR") || clean.startsWith("TESON")) continue;
      if (clean !== "") current.push(clean);
    }
  }

  if (current.length > 0) result.push(current.join("\n"));
  return result;
}

// ---------- Componente principal ----------
export default function HP71Emulator() {
  const [screenText, setScreenText] = useState("SANTA BARBARA");
  const [buffer, setBuffer] = useState("");
  const [loading, setLoading] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);

  // Estado de navegación de piezas
  const [pieces, setPieces] = useState<string[]>([]);
  const [pieceIndex, setPieceIndex] = useState(0);
  const [pieceMode, setPieceMode] = useState(false);

  // Estado para almacenar resultados manuales extraídos
  const [manualResults, setManualResults] = useState<{alcance: number, elevacion: number, tof: number}[]>([]);

  // Nuevos estados para pieza base
  const [basePieceNumber, setBasePieceNumber] = useState<number>(1);
  const [waitingBasePiece, setWaitingBasePiece] = useState<boolean>(false);

  // ---------- Arranque original: SANTA BARBARA durante 2 segundos ----------
  useEffect(() => {
    const timer = setTimeout(() => {
      setPromptVisible(true);
      setScreenText("> ");
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // ---------- Función para registrar eventos en el log ----------
  const logEvent = useCallback(async (type: 'INPUT' | 'OUTPUT', content: string) => {
    try {
      await fetch('/api/hp71/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content }),
      });
    } catch (err) {
      console.error('Error logging event:', err);
    }
  }, []);

  // ---------- Envío de comandos al servidor ----------
  const sendCommand = useCallback(async (command: string) => {
    if (!command.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/hp71?cmd=${encodeURIComponent(command)}`, { method: "POST" });
      const json = await res.json();
      const responseText: string = json.display || "";

      // Lógica nueva para pieza base
      const basePiece = extractBasePiece(responseText);
      if (basePiece !== null) {
        setBasePieceNumber(basePiece);
        setWaitingBasePiece(true);
      }
      if (!isAskingForBasePiece(responseText)) {
        setWaitingBasePiece(false);
      }

      // ---------- Extraer QE, TOF y Alcance siempre que aparezcan ----------
      if (/DIST/i.test(responseText)) {
        const distMatch = responseText.match(/DIST\s+(\d+(?:\.\d+)?)/);
        const qeMatch   = responseText.match(/QE\s+(\d+(?:\.\d+)?)/);
        const tofMatch  = responseText.match(/TOF\s+(\d+(?:\.\d+)?)/);

        if (distMatch && qeMatch && tofMatch) {
          setManualResults(prev => [...prev, {
            alcance: parseFloat(distMatch[1]),
            elevacion: parseFloat(qeMatch[1]),
            tof: parseFloat(tofMatch[1])
          }]);
        }
      }

      // ---------- Detectar múltiples piezas ----------
      const foundPieces = parsePieces(responseText);
      if (foundPieces.length > 0) {
        setPieces(foundPieces);
        setPieceIndex(Math.max(0, Math.min(basePieceNumber - 1, foundPieces.length - 1)));
        setPieceMode(true);
        setPromptVisible(false);
      } else {
        setPieceMode(false);
        setScreenText(responseText + "\n> ");
        setPromptVisible(true);
      }
    } catch (error) {
      console.error('Error sending command:', error);
      setScreenText("ERROR\n> ");
      setPromptVisible(true);
    } finally {
      setLoading(false);
    }
  }, [basePieceNumber]);

  // ---------- Manejo unificado de teclas ----------
    const handleKeyPress = useCallback(
    (key: string) => {
      console.log("Tecla presionada:", key);

      // Navegación de piezas (se registra con símbolos)
      if (key === "UP") {
        logEvent('INPUT', 'USUARIO: ▲');
        setPieceIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (key === "DOWN") {
        logEvent('INPUT', 'USUARIO: ▼');
        setPieceIndex((prev) => Math.min(prev + 1, pieces.length - 1));
        return;
      }

      // Salir del modo piezas
      setPieceIndex(0);
      setPieceMode(false);

      // Tecla RUN
      if (key === "RUN") {
        setBuffer("");
        sendCommand("MAIN");
        logEvent('INPUT', 'USUARIO: MAIN');
        return;
      }

      // Tecla ENTER → envía el comando acumulado o "MAIN"
      if (key === "ENTER") {
        const cmd = buffer.trim() === "" ? "MAIN" : buffer.trim();
        if (waitingBasePiece && /^\d+$/.test(cmd) && parseInt(cmd, 10) > 0) {
          setBasePieceNumber(parseInt(cmd, 10));
          setWaitingBasePiece(false);
        }
        setBuffer("");
        sendCommand(cmd);
        logEvent('INPUT', `USUARIO: ${cmd}`);
        return;
      }

      // Tecla ON (reinicio)
      if (key === "ON") {
        setBuffer("");
        setScreenText("SANTA BARBARA");
        setPromptVisible(false);
        setPieceMode(false);
        setManualResults([]);
        setBasePieceNumber(1);
        setWaitingBasePiece(false);
        setTimeout(() => {
          setPromptVisible(true);
          setScreenText("> ");
        }, 2000);
        logEvent('INPUT', 'USUARIO: ON');
        return;
      }

      // BACK y SPC no se registran, solo modifican el buffer
      if (key === "BACK") {
        setBuffer((prev) => prev.slice(0, -1));
        return;
      }
      if (key === " ") {
        setBuffer((prev) => prev + " ");
        return;
      }

      // Tecla normal (se añade al buffer sin registrar)
      if ((key === "P" || key === "Y" || key === "N") && pieces.length > 0) {
        setPieceIndex(Math.max(0, Math.min(basePieceNumber - 1, pieces.length - 1)));
      }
      setBuffer((prev) => prev + key.toUpperCase());
    },
    [buffer, sendCommand, pieces.length, logEvent, waitingBasePiece, basePieceNumber]
  );

  // ---------- Teclado físico ----------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.repeat) return; // evita repeticiones
      e.preventDefault();

      if (e.key === "ArrowUp") handleKeyPress("UP");
      else if (e.key === "ArrowDown") handleKeyPress("DOWN");
      else if (e.key === "Enter") handleKeyPress("ENTER");
      else if (e.key === "Backspace") handleKeyPress("BACK");
      else if (e.key === "Escape") handleKeyPress("ON");
      else if (e.key === " ") handleKeyPress(" ");
      else if (/^[a-zA-Z0-9.\/*\-+,=^()<>_]$/.test(e.key))
        handleKeyPress(e.key.toUpperCase());
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKeyPress]);

  // ---------- Contenido del LCD ----------
  const lcdContent = loading
    ? "BUSCANDO..."
    : pieceMode && pieces.length > 0
    ? `${pieces[pieceIndex]}\n\nPIECE ${pieceIndex + 1}/${pieces.length}\n← → flechas para mover`
    : promptVisible
    ? screenText + buffer
    : screenText;

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#1b1b1b] p-8">
      <div className="bg-[#6f6f6f] rounded-xl p-8 w-[880px] shadow-[0_0_40px_rgba(0,0,0,0.7)]">
        {/* Enlace al log */}
        <div className="flex justify-end mb-1">
          <a
            href="/hp71_log.txt"
            target="_blank"
            className="text-[#baff7c] text-sm underline hover:text-white"
          >
            📄 LOG
          </a>
        </div>

        {/* ---------- Pantalla LCD ---------- */}
        <div className="bg-[#cbbf97] rounded-md mb-5 h-[280px] flex p-2">
          <div className="bg-[#1f1f1f] text-[#baff7c] font-mono text-[20px] leading-[1.35] tracking-[1px] w-full h-full overflow-hidden whitespace-pre p-3 border-4 border-[#bfb68c] rounded">
            {lcdContent}
          </div>
        </div>

        {/* ---------- Teclado ---------- */}
        <div className="flex justify-between">
          {/* Bloque izquierdo */}
          <div className="grid grid-cols-10 gap-2">
            <KeyButton label="Q" data="Q" onClick={handleKeyPress} />
            <KeyButton label="W" data="W" onClick={handleKeyPress} />
            <KeyButton label="E" data="E" onClick={handleKeyPress} />
            <KeyButton label="R" data="R" onClick={handleKeyPress} />
            <KeyButton label="T" data="T" onClick={handleKeyPress} />
            <KeyButton label="Y" data="Y" onClick={handleKeyPress} />
            <KeyButton label="U" data="U" onClick={handleKeyPress} />
            <KeyButton label="I" data="I" onClick={handleKeyPress} />
            <KeyButton label="O" data="O" onClick={handleKeyPress} />
            <KeyButton label="P" data="P" onClick={handleKeyPress} />

            <KeyButton label="A" data="A" onClick={handleKeyPress} />
            <KeyButton label="S" data="S" onClick={handleKeyPress} />
            <KeyButton label="D" data="D" onClick={handleKeyPress} />
            <KeyButton label="F" data="F" onClick={handleKeyPress} />
            <KeyButton label="G" data="G" onClick={handleKeyPress} />
            <KeyButton label="H" data="H" onClick={handleKeyPress} />
            <KeyButton label="J" data="J" onClick={handleKeyPress} />
            <KeyButton label="K" data="K" onClick={handleKeyPress} />
            <KeyButton label="L" data="L" onClick={handleKeyPress} />
            <KeyButton label="=" data="=" onClick={handleKeyPress} />

            <KeyButton label="Z" data="Z" onClick={handleKeyPress} />
            <KeyButton label="X" data="X" onClick={handleKeyPress} />
            <KeyButton label="C" data="C" onClick={handleKeyPress} />
            <KeyButton label="V" data="V" onClick={handleKeyPress} />
            <KeyButton label="B" data="B" onClick={handleKeyPress} />
            <KeyButton label="N" data="N" onClick={handleKeyPress} />
            <KeyButton label="M" data="M" onClick={handleKeyPress} />
            <KeyButton label="(" data="(" onClick={handleKeyPress} />
            <KeyButton label=")" data=")" onClick={handleKeyPress} />

            <KeyButton label="ENDLINE" data="ENTER" className="col-span-2 h-[92px]" onClick={handleKeyPress} />
            <KeyButton label="ON" data="ON" onClick={handleKeyPress} />
            <KeyButton label="f" data="F" color="yellow" onClick={handleKeyPress} />
            <KeyButton label="g" data="G" color="blue" onClick={handleKeyPress} />
            <KeyButton label="RUN" data="RUN" onClick={handleKeyPress} />
            <KeyButton label="←" data="BACK" onClick={handleKeyPress} />
            <KeyButton label="→" data="RIGHT" onClick={handleKeyPress} />
            <KeyButton label="SPC" data=" " onClick={handleKeyPress} />
            <KeyButton label="↑" data="UP" onClick={handleKeyPress} />
            <KeyButton label="↓" data="DOWN" onClick={handleKeyPress} />
          </div>

          {/* Bloque derecho (numpad) */}
          <div className="grid grid-cols-4 gap-2">
            <KeyButton label="7" data="7" color="light" onClick={handleKeyPress} />
            <KeyButton label="8" data="8" color="light" onClick={handleKeyPress} />
            <KeyButton label="9" data="9" color="light" onClick={handleKeyPress} />
            <KeyButton label="/" data="/" color="light" onClick={handleKeyPress} />

            <KeyButton label="4" data="4" color="light" onClick={handleKeyPress} />
            <KeyButton label="5" data="5" color="light" onClick={handleKeyPress} />
            <KeyButton label="6" data="6" color="light" onClick={handleKeyPress} />
            <KeyButton label="*" data="*" color="light" onClick={handleKeyPress} />

            <KeyButton label="1" data="1" color="light" onClick={handleKeyPress} />
            <KeyButton label="2" data="2" color="light" onClick={handleKeyPress} />
            <KeyButton label="3" data="3" color="light" onClick={handleKeyPress} />
            <KeyButton label="-" data="-" color="light" onClick={handleKeyPress} />

            <KeyButton label="0" data="0" color="light" onClick={handleKeyPress} />
            <KeyButton label="." data="." color="light" onClick={handleKeyPress} />
            <KeyButton label="," data="," color="light" onClick={handleKeyPress} />
            <KeyButton label="+" data="+" color="light" onClick={handleKeyPress} />
          </div>
        </div>
      </div>
    </div>
  );
}