import React from "react";
import { motion } from "framer-motion";

/**
 * ClipForge polygonal vault icon with AI sparks.
 * size: number (px) — controls SVG dimensions
 * variant: "default" | "mono" | "spin" | "loading" | "hover"
 * showText: boolean
 * className: string
 */
export default function ClipForgeLogo({ size = 36, variant = "default", showText = false, className = "" }) {
  const sparks = [
    { cx: 78, cy: 14, r: 2.2, delay: 0 },
    { cx: 88, cy: 24, r: 1.5, delay: 0.3 },
    { cx: 72, cy: 8,  r: 1.2, delay: 0.6 },
    { cx: 20, cy: 76, r: 1.8, delay: 0.9 },
    { cx: 10, cy: 64, r: 1.2, delay: 1.2 },
    { cx: 82, cy: 70, r: 1.0, delay: 1.5 },
  ];

  const isLoading = variant === "loading";
  const isSpin = variant === "spin";

  return (
    <div className={`flex items-center gap-2 select-none ${className}`} style={{ lineHeight: 1 }}>
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        whileHover={{ scale: 1.08 }}
        animate={
          isSpin
            ? { rotate: 360 }
            : isLoading
            ? { scale: [1, 1.1, 1] }
            : {}
        }
        transition={
          isSpin
            ? { duration: 8, repeat: Infinity, ease: "linear" }
            : isLoading
            ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.2 }
        }
      >
        <defs>
          <linearGradient id="cfGrad1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00BFFF" />
            <stop offset="55%" stopColor="#9370DB" />
            <stop offset="100%" stopColor="#FFB6C1" />
          </linearGradient>
          <linearGradient id="cfGrad2" x1="0" y1="96" x2="96" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#9370DB" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#00BFFF" stopOpacity="0.25" />
          </linearGradient>
          <filter id="cfGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="cfSparkGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Vault body */}
        <motion.polygon
          points="48,4 88,22 88,62 48,92 8,62 8,22"
          fill="url(#cfGrad2)"
          stroke="url(#cfGrad1)"
          strokeWidth="2.5"
          filter="url(#cfGlow)"
          animate={isLoading ? { opacity: [0.6, 1, 0.6] } : { opacity: 1 }}
          transition={{ duration: 1.4, repeat: isLoading ? Infinity : 0 }}
        />

        {/* Inner hexagon ring */}
        <motion.polygon
          points="48,18 72,34 72,62 48,78 24,62 24,34"
          fill="none"
          stroke="url(#cfGrad1)"
          strokeWidth="1.5"
          opacity="0.45"
          animate={isLoading ? { opacity: [0.2, 0.6, 0.2] } : {}}
          transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
        />

        {/* Lock shackle */}
        <motion.path
          d="M40 45 L40 40 C40 35.6 43.6 32 48 32 C52.4 32 56 35.6 56 40 L56 45"
          stroke="url(#cfGrad1)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          animate={isLoading ? { pathLength: [0.3, 1, 0.3] } : { pathLength: 1 }}
          initial={{ pathLength: isLoading ? 0.3 : 1 }}
          transition={{ duration: 1.6, repeat: isLoading ? Infinity : 0 }}
        />

        {/* Lock body */}
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
            filter="url(#cfSparkGlow)"
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1.3, 0.4] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              delay: s.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.svg>

      {showText && (
        <motion.span
          className="font-black tracking-tight leading-none"
          style={{
            fontSize: Math.max(size * 0.52, 12),
            background: "linear-gradient(135deg, #00BFFF 0%, #9370DB 55%, #FFB6C1 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          ClipForge
        </motion.span>
      )}
    </div>
  );
}