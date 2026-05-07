"use client";
import React, { useEffect, useRef } from 'react';

export const TacticalBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const ACCENT_COLOR = '#F39C63';
        const GRID_SIZE = 50;
        let pings: any[] = [];
        let units: any[] = [];
        const MAX_UNITS = 12;
        let animationFrameId: number;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            units = Array.from({ length: MAX_UNITS }, () => new Unit(canvas.width, canvas.height));
        };

        class Unit {
            x: number; y: number; vx: number; vy: number; history: any[];
            constructor(w: number, h: number) {
                this.x = Math.random() * w;
                this.y = Math.random() * h;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.history = [];
            }
            update(w: number, h: number) {
                this.history.push({ x: this.x, y: this.y });
                if (this.history.length > 20) this.history.shift();
                this.x += this.vx; this.y += this.vy;
                if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) {
                    this.x = Math.random() * w; this.y = Math.random() * h;
                }
                if (Math.random() < 0.005) pings.push(new Ping(this.x, this.y));
            }
            draw(context: CanvasRenderingContext2D) {
                context.beginPath();
                context.strokeStyle = ACCENT_COLOR;
                context.globalAlpha = 0.3;
                this.history.forEach((p, i) => {
                    if (i === 0) context.moveTo(p.x, p.y);
                    else context.lineTo(p.x, p.y);
                });
                context.stroke();
                context.globalAlpha = 1;
                context.fillStyle = ACCENT_COLOR;
                context.fillRect(this.x - 2, this.y - 2, 4, 4);
            }
        }

        class Ping {
            x: number; y: number; radius: number; alpha: number; dead: boolean;
            constructor(x: number, y: number) {
                this.x = x; this.y = y; this.radius = 0; this.alpha = 0.6; this.dead = false;
            }
            update() {
                this.radius += 1.5; this.alpha -= 0.01;
                if (this.alpha <= 0) this.dead = true;
            }
            draw(context: CanvasRenderingContext2D) {
                context.beginPath();
                context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                context.strokeStyle = ACCENT_COLOR;
                context.globalAlpha = this.alpha;
                context.stroke();
            }
        }

        const animate = () => {
            ctx.fillStyle = 'rgba(10, 12, 16, 0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw Grid
            ctx.strokeStyle = '#ffffff';
            ctx.globalAlpha = 0.05;
            ctx.beginPath();
            for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
                ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
            }
            for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
                ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
            }
            ctx.stroke();

            pings = pings.filter(p => !p.dead);
            pings.forEach(p => { p.update(); p.draw(ctx); });
            units.forEach(u => { u.update(canvas.width, canvas.height); u.draw(ctx); });

            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resize);
        resize();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <>
            <div className="fixed inset-0 pointer-events-none z-0" style={{ 
                background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%)',
                backgroundSize: '100% 2px'
            }} />
            <canvas ref={canvasRef} className="fixed inset-0 w-full h-full bg-[#0a0c10] -z-10" />
        </>
    );
};