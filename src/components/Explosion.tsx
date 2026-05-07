import React from 'react';

export const Explosion = () => (
  <div className="relative pointer-events-none z-50 flex items-center justify-center">
    {/* Onda expansiva lenta */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-6 h-6 bg-orange-600 rounded-full animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite] opacity-80" />
      <div className="absolute w-24 h-24 border-4 border-orange-500/40 rounded-full animate-[ping_0.8s_ease-out_1] opacity-0" />
    </div>
    
    {/* Destello Central */}
    <div className="relative flex items-center justify-center animate-[pulse_0.4s_ease-in-out_infinite]">
      <div className="absolute w-16 h-[2px] bg-white blur-[1px] rounded-full opacity-90" />
      <div className="absolute w-[2px] h-16 bg-white blur-[1px] rounded-full opacity-90" />
      <div className="absolute w-12 h-[1px] bg-white blur-[1px] rotate-45 rounded-full opacity-80" />
      <div className="absolute w-[1px] h-12 bg-white blur-[1px] rotate-45 rounded-full opacity-80" />
      <div className="w-6 h-6 bg-yellow-100 rounded-full blur-lg shadow-[0_0_30px_#fff] opacity-90" />
    </div>

    {/* Partículas de impacto */}
    {[...Array(8)].map((_, i) => (
      <div 
        key={i}
        className="absolute w-[3px] h-8 bg-orange-400 rounded-full opacity-0 animate-[ping_1.2s_ease-out_1]"
        style={{
          transform: `rotate(${i * 45}deg) translateY(-20px)`,
          animationFillMode: 'forwards'
        }}
      />
    ))}
  </div>
);
