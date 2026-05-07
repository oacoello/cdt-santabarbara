// src/components/TacticalAlert.tsx
import React from 'react';
import { Button } from "@/components/ui/button";

interface TacticalAlertProps {
  message: string;
  onAction: () => void;
}

export const TacticalAlert = ({ message, onAction }: TacticalAlertProps) => {
  return (
    <div className="absolute inset-0 bg-black/60 z-[9999] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-[#22201f] rounded-2xl p-6 shadow-2xl border border-white/5 animate-in fade-in zoom-in duration-300">
        <div className="flex items-start gap-4 mb-8">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#3d2b1f] flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-[#f39c63] flex items-center justify-center text-[#3d2b1f]">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10h2v4h-2v-4zm0 6h2v2h-2v-2z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="pt-1">
            <p className="text-white text-lg font-medium leading-tight">{message}</p>
          </div>
        </div>
        <div className="flex justify-center">
          <Button
            onClick={onAction}
            className="w-full py-6 bg-[#3d2b1f] hover:bg-[#4d3728] text-[#f39c63] font-bold rounded-lg transition-colors border-none"
          >
            INICIAR SESIÓN
          </Button>
        </div>
      </div>
    </div>
  );
};