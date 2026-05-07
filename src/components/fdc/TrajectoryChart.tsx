// components/TrajectoryChart.tsx
"use client";

import { useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { generateRealTrajectory, WeaponSystem } from '@/lib/ballistics';

interface Props {
  range: number;
  muzzleVelocity: number;
  weapon: WeaponSystem;
}

export function TrajectoryChart({ range, muzzleVelocity, weapon }: Props) {
  // Generamos la trayectoria real basada en el nuevo motor RK4
  const trajectoryData = useMemo(() => {
    if (!range || !muzzleVelocity) return [];
    const { points } = generateRealTrajectory(range, muzzleVelocity);
    return points;
  }, [range, muzzleVelocity]);

  const maxAlt = useMemo(() => {
  if (trajectoryData.length === 0) return 500;
  const actualMax = Math.max(...trajectoryData.map(p => p.altitude));
  // Añadimos un margen del 10% arriba para que no toque el borde superior
  return actualMax > 0 ? actualMax * 1.1 : 500;
}, [trajectoryData]);

  return (
    <div className="h-64 w-full bg-slate-900/50 p-4 rounded-xl border border-slate-700">
      <h3 className="text-xs font-bold text-slate-400 uppercase mb-4">
        Perfil Balístico Real (RK4 + Drag) - {weapon}
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trajectoryData}>
          <defs>
            <linearGradient id="colorAlt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="distance" 
            stroke="#94a3b8" 
            fontSize={10}
            tickFormatter={(value) => `${(value / 1000).toFixed(1)}km`}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={10} 
            domain={[0, Math.ceil(maxAlt / 100) * 100]}
            tickFormatter={(value) => `${value}m`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px' }}
            itemStyle={{ color: '#3b82f6' }}
            formatter={(value: any, name: string) => [
              `${value}${name === 'altitude' ? 'm' : name === 'velocity' ? ' m/s' : 's'}`, 
              name === 'altitude' ? 'Altitud' : name === 'velocity' ? 'Velocidad' : 'Tiempo'
            ]}
          />
          <Area
            type="monotone"
            dataKey="altitude"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorAlt)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}