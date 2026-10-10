'use client';

import React, { useEffect, useState } from 'react';

export default function ScaleWrapper({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function handleResize() {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Forced resolution for testing
      const targetWidth = 1366;
      const targetHeight = 768;

      const scaleX = windowWidth / targetWidth;
      const scaleY = windowHeight / targetHeight;

      setScale(Math.min(scaleX, scaleY));
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black overflow-hidden relative cdt-scale-wrapper">
      <div 
        style={{ 
          width: 1366, 
          height: 768, 
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0
        }}
        className="relative overflow-hidden bg-black"
      >
        {children}
      </div>
    </div>
  );
}
