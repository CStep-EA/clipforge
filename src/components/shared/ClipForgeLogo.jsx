import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

/**
 * ClipForge polygonal vault icon with AI sparks.
 * size: number (px)
 * variant: "default" | "mono" | "spin" | "loading"
 * showText: boolean
 */
export default function ClipForgeLogo({ size = 36, variant = "default", showText = false, className = "" }) {
  const sparks = [
    { cx: 78, cy: 14, r: 2.2, delay: 0 },
    { cx: 88, cy: 24, r: 1.5, delay: 0.3 },
    { cx: 72, cy: 8,  r: 1.2, delay: 0.6 },
    { cx: 20, cy: 76, r: 1.8, delay: 0.9 },
    { cx: 10, cy: 64, r: 1.2, delay: 1.2 },
  ];

  return (
    <div className={`flex items-center gap-2 ${className}`} style={{ lineHeight: 1 }}>
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={variant === "spin" ? { rotate: 360 } : variant === "loading" ? { scale: [1, 1.08, 1] } : {}}
        transition={
          variant === "spin"
            ? { duration: 8, repeat: Infinity, ease: "linear" }
            : variant === "loading"
            ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
            : {}
        }
      >
        <defs>
          <linearGradient id="cfGrad1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00BFFF" />
            <stop offset="55%" stopColor="#9370DB" />
            <stop offset="100%" stopColor="#FFB6C1" />
          </linearGradient>
          <linearGradient id="cfGrad2" x1="0" y1="96" x2="96" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#9370DB" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#00BFFF" stopOpacity="0.3" />
          </linearGradient>
          <filter id="cfGlow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Vault body — adaptive polygon */}
        <motion.polygon
          points="48,4 88,22 88,62 48,92 8,62 8,22"
          fill="url(#cfGrad2)"
          stroke="url(#cfGrad1)"
          strokeWidth="2.5"
          filter="url(#cfGlow)"
          animate={variant === "loading" ? { opacity: [0.7, 1, 0.7] } : {}}
          transition={{ duration: 1.2, repeat: Infinity }}
        />

        {/* Inner diamond */}
        <polygon
          points="48,18 72,34 72,62 48,78 24,62 24,34"
          fill="none"
          stroke="url(#cfGrad1)"
          strokeWidth="1.5"
          opacity="0.5"
        />

        {/* Clip bolt / lock icon */}
        <motion.path
          d="M40 45 L40 40 C40 35.6 43.6 32 48 32 C52.4 32 56 35.6 56 40 L56 45"
          stroke="url(#cfGrad1)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          animate={variant === "loading" ? { pathLength: [0, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <rect x="36" y="44" width="24" height="18" rx="4" fill="url(#cfGrad1)" opacity="0.9" />
        <circle cx="48" cy="53" r="3" fill="white" opacity="0.9" />

        {/* AI sparks */}
        {sparks.map((s, i) => (
          <motion.circle
            key={i}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill="#00BFFF"
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
          />
        ))}
      </motion.svg>

      {showText && (
        <span
          className="font-black tracking-tight select-none"
          style={{
            fontSize: size * 0.55,
            background: "linear-gradient(135deg, #00BFFF 0%, #9370DB 55%, #FFB6C1 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          ClipForge
        </span>
      )}
    </div>
  );
}