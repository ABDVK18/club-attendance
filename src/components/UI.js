'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export function AnimatedCounter({ value }) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => Math.round(current));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
}

export function RadarScanner() {
  return (
    <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/10 overflow-hidden shadow-[0_0_15px_rgba(14,165,233,0.2)]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        className="absolute inset-0"
        style={{
          background: 'conic-gradient(from 0deg, transparent 70%, rgba(56, 189, 248, 0.8) 100%)',
        }}
      />
      <div className="relative z-10 h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
    </div>
  );
}

export function TiltCard({ children, className = "", delay = 0 }) {
  const cardRef = useRef(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [spotlight, setSpotlight] = useState({ x: 0, y: 0, opacity: 0 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setRotation({
      x: ((y - rect.height / 2) / (rect.height / 2)) * -4,
      y: ((x - rect.width / 2) / (rect.width / 2)) * 4,
    });
    setSpotlight({ x, y, opacity: 1 });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
    setSpotlight((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.7, delay: delay, ease: [0.23, 1, 0.32, 1] }}
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1200px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        transition: 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)',
      }}
      className={`group relative overflow-hidden rounded-3xl border-t border-white/15 border-x border-white/5 border-b border-transparent bg-gradient-to-b from-white/[0.06] to-transparent backdrop-blur-2xl shadow-[0_15px_35px_rgba(0,0,0,0.4)] hover:shadow-[0_15px_40px_rgba(14,165,233,0.12)] ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity: spotlight.opacity,
          background: `radial-gradient(500px circle at ${spotlight.x}px ${spotlight.y}px, rgba(255,255,255,0.06), transparent 60%)`,
        }}
      />
      {children}
    </motion.div>
  );
}

export function StatContent({ title, value, subtitle, icon }) {
  return (
    <div className="p-7">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-400">{title}</p>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border-t border-white/10 border-b border-transparent bg-white/[0.02] shadow-inner transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
      </div>
      <p className="mt-5 text-5xl font-bold tracking-tighter text-white">
        {typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
      </p>
      <p className="mt-1.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{subtitle}</p>
    </div>
  );
}

export function LogEntry({ name, uid, time, status, active = false }) {
  const isEntry = status === 'Entry';
  return (
    <div className="group/item flex items-center justify-between rounded-xl border-t border-white/5 border-b border-transparent bg-white/[0.02] px-4 py-3.5 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.05] hover:translate-x-1 cursor-default">
      <div className="flex items-center gap-4">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border-t border-white/10 border-b border-transparent bg-black/40 shadow-inner">
          <div className={`h-2 w-2 rounded-full transition-all duration-500 ${isEntry ? 'bg-sky-400 shadow-[0_0_10px_#38bdf8] group-hover/item:scale-150' : 'bg-zinc-600'}`} />
          {active && <span className="absolute h-4 w-4 rounded-full bg-sky-400/30 animate-ping" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-200 tracking-tight group-hover/item:text-white transition-colors">{name}</p>
          <p className="text-[10px] font-mono font-medium tracking-widest text-zinc-500">{uid}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-zinc-200">{time}</p>
        <p className={`text-[11px] font-bold tracking-wide transition-colors ${isEntry ? 'text-sky-400 group-hover/item:text-sky-300' : 'text-zinc-500'}`}>{status}</p>
      </div>
    </div>
  );
}

export function ActionItem({ label, count }) {
  return (
    <button className="group flex w-full items-center justify-between rounded-xl border-t border-white/5 border-b border-transparent bg-white/[0.02] px-4 py-3.5 text-sm font-medium text-zinc-300 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.06] hover:text-white active:scale-[0.98]">
      <span className="font-semibold tracking-tight">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-500 font-mono tracking-widest">{count}</span>
        <ChevronRight size={16} className="text-zinc-600 transition-all duration-300 group-hover:translate-x-1 group-hover:text-sky-400" />
      </div>
    </button>
  );
}

export function EmberKeycap({ label, subLabel }) {
  return (
    <div className="threeui-page-button-ember-wrap">
      <style>{`
        .threeui-page-button-ember-wrap { position: relative; display: inline-block; font-family: "JetBrains Mono", "SFMono-Regular", Menlo, Consolas, monospace; }
        .threeui-page-button-ember-glow, .threeui-page-button-ember-bloom { position: absolute; pointer-events: none; border-radius: 50%; mix-blend-mode: plus-lighter; transition: opacity .16s ease, transform .16s ease; }
        .threeui-page-button-ember-glow { left: 6%; right: 6%; top: -9px; height: 16px; background: radial-gradient(closest-side, rgba(255, 182, 182, .95), rgba(239, 68, 68, .62) 50%, rgba(220, 38, 38, 0) 100%); filter: blur(4px); opacity: 1; }
        .threeui-page-button-ember-bloom { left: -10%; right: -10%; top: -31px; height: 58px; background: radial-gradient(closest-side, rgba(239, 68, 68, .55), rgba(185, 28, 28, .18) 58%, rgba(153, 27, 27, 0) 100%); filter: blur(12px); opacity: .85; }
        .threeui-page-button--ember-keycap { position: relative; z-index: 10; display: flex; align-items: center; gap: .85em; padding: 1.05em 1.6em 1.1em; border-radius: 9px; border: none; cursor: pointer; background: linear-gradient(178deg, #4a4d54 0%, #34373d 18%, #23262b 62%, #1a1c20 100%); box-shadow: inset 0 1.5px 0 rgba(255, 238, 225, .22), inset 0 -1px 0 rgba(0, 0, 0, .75), 0 7px 0 -1px #101215, 0 12px 26px rgba(0, 0, 0, .62); color: #fff1e2; font-size: 14px; font-weight: 500; letter-spacing: .13em; text-transform: uppercase; transform: translateY(0); transition: transform .13s cubic-bezier(.3, .7, .3, 1), box-shadow .13s ease; }
        .threeui-page-button--ember-keycap .threeui-page-button__spark { width: 1.1em; height: 1.1em; flex: none; fill: #ef4444; filter: drop-shadow(0 0 .55em rgba(239, 68, 68, .9)); }
        .threeui-page-button--ember-keycap .threeui-page-button__price { color: #fca5a5; }
        .threeui-page-button-ember-wrap:hover .threeui-page-button--ember-keycap, .threeui-page-button--ember-keycap:focus-visible { transform: translateY(5px); box-shadow: inset 0 1.5px 0 rgba(255, 238, 225, .26), inset 0 -1px 0 rgba(0, 0, 0, .75), 0 2px 0 -1px #101215, 0 5px 14px rgba(0, 0, 0, .6); }
        .threeui-page-button-ember-wrap:hover .threeui-page-button-ember-glow { transform: translateY(5px) scaleX(1.05); }
        .threeui-page-button-ember-wrap:hover .threeui-page-button-ember-bloom { opacity: 1; transform: translateY(5px) scale(1.05); }
        .threeui-page-button--ember-keycap:active { transform: translateY(6px); }
      `}</style>
      <button className="threeui-page-button--ember-keycap" type="button">
        <svg className="threeui-page-button__spark" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M50 4 L61 39 L96 50 L61 61 L50 96 L39 61 L4 50 L39 39 Z" />
        </svg>
        <span>{label}</span>
        {subLabel && <span className="threeui-page-button__price">{subLabel}</span>}
      </button>
      <span className="threeui-page-button-ember-glow" aria-hidden="true" />
      <span className="threeui-page-button-ember-bloom" aria-hidden="true" />
    </div>
  );
}