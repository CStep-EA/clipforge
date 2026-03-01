import React from "react";
import { motion } from "framer-motion";

/**
 * ClipForge polygonal vault with inner diamond/lock + animated AI sparks.
 *
 * size     : number (px) — icon dimensions. Presets: sm=24, md=36, lg=48
 * variant  : "default" | "mono" | "spin" | "loading" | "hover" | "morph"
 * showText : boolean — render "ClipForge" gradient text beside icon
 * className: string
 */
export default function ClipForgeLogo({ size = 36, variant = "default", showText = false, className = "" }) {
  const isLoading = variant === "loading";
  const isSpin    = variant === "spin";
  const isMorph   = variant === "morph";

  // Vault polygon points — two states for morph
  const vaultA = "48,4 88,22 88,62 48,92 8,62 8,22";
  const vaultB = "48,2 90,20 92,64 48,94 6,64 8,20";

  const sparks = [
    { cx: 80, cy: 12, r: 2.4, delay: 0,   color: "#00BFFF" },
    { cx: 90, cy: 26, r: 1.6, delay: 0.35, color: "#9370DB" },
    { cx: 74, cy: 6,  r: 1.2, delay: 0.7,  color: "#00BFFF" },
    { cx: 18, cy: 78, r: 1.9, delay: 1.0,  color: "#FFB6C1" },
    { cx: 8,  cy: 62, r: 1.3, delay: 1.4,  color: "#9370DB" },
    { cx: 84, cy: 72, r: 1.1, delay: 1.8,  color: "#00BFFF" },
    { cx: 56, cy: 88, r: 1.0, delay: 2.1,  color: "#FFB6C1" },
    { cx: 6,  cy: 30, r: 1.4, delay: 2.5,  color: "#9370DB" },
  ];

  // Inner diamond points
  const diamond = "48,22 64,48 48,74 32,48";

  return (
    <div className={`flex items-center gap-2 select-none ${className}`} style={{ lineHeight: 1 }}>
      <motion.svg
        role="img"
        aria-label="ClipForge Logo"
        width={size}
        height={size}
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        whileHover={{ scale: 1.1, filter: "drop-shadow(0 0 10px rgba(0,191,255,0.5))" }}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={
          isSpin    ? { rotate: 360, scale: 1, opacity: 1 } :
          isLoading ? { scale: [1, 1.12, 1], opacity: 1 } :
          isMorph   ? { scale: 1, opacity: 1 } :
                      { scale: 1, opacity: 1 }
        }
        transition={
          isSpin    ? { rotate: { duration: 8, repeat: Infinity, ease: "linear" }, scale: { duration: 0.4 }, opacity: { duration: 0.3 } } :
          isLoading ? { scale: { duration: 1.2, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.3 } } :
                      { duration: 0.4, ease: "easeOut" }
        }
      >
        <defs>
          <linearGradient id="cfGrad1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#00BFFF" />
            <stop offset="55%"  stopColor="#9370DB" />
            <stop offset="100%" stopColor="#FFB6C1" />
          </linearGradient>
          <linearGradient id="cfGrad2" x1="0" y1="96" x2="96" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#9370DB" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#00BFFF" stopOpacity="0.22" />
          </linearGradient>
          <linearGradient id="cfDiamondGrad" x1="32" y1="22" x2="64" y2="74" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#00BFFF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#9370DB" stopOpacity="0.15" />
          </linearGradient>
          <filter id="cfGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="cfSparkGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="cfLockGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Vault body — morphs on load */}
        <motion.polygon
          fill="url(#cfGrad2)"
          stroke="url(#cfGrad1)"
          strokeWidth="2.5"
          filter="url(#cfGlow)"
          animate={{
            points: isMorph ? [vaultA, vaultB, vaultA] : vaultA,
            opacity: isLoading ? [0.55, 1, 0.55] : 1,
          }}
          initial={{ points: vaultA }}
          transition={
            isMorph
              ? { points: { duration: 4, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.3 } }
              : { opacity: { duration: 1.4, repeat: isLoading ? Infinity : 0 } }
          }
        />

        {/* Inner hexagon ring */}
        <motion.polygon
          points="48,18 72,34 72,62 48,78 24,62 24,34"
          fill="none"
          stroke="url(#cfGrad1)"
          strokeWidth="1.2"
          opacity="0"
          animate={{ opacity: isLoading ? [0.15, 0.5, 0.15] : [0, 0.4] }}
          transition={{ opacity: { duration: isLoading ? 1.4 : 0.6, repeat: isLoading ? Infinity : 0, delay: 0.2 } }}
        />

        {/* Inner diamond */}
        <motion.polygon
          points={diamond}
          fill="url(#cfDiamondGrad)"
          stroke="url(#cfGrad1)"
          strokeWidth="0.8"
          opacity="0"
          animate={{ opacity: [0, 0.7] }}
          transition={{ duration: 0.5, delay: 0.25 }}
        />

        {/* Lock shackle */}
        <motion.path
          d="M40 46 L40 40 C40 35.6 43.6 32 48 32 C52.4 32 56 35.6 56 40 L56 46"
          stroke="url(#cfGrad1)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          filter="url(#cfLockGlow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: isLoading ? [0.3, 1, 0.3] : 1 }}
          transition={{ duration: isLoading ? 1.6 : 0.5, repeat: isLoading ? Infinity : 0, ease: "easeOut" }}
        />

        {/* Lock body */}
        <motion.rect
          x="36" y="45" width="24" height="18" rx="4"
          fill="url(#cfGrad1)"
          opacity="0"
          animate={{ opacity: [0, 0.92] }}
          transition={{ duration: 0.4, delay: 0.3 }}
        />

        {/* Keyhole */}
        <motion.circle
          cx="48" cy="54" r="3"
          fill="white"
          opacity="0"
          animate={{ opacity: [0, 0.9] }}
          transition={{ duration: 0.3, delay: 0.45 }}
        />
        <motion.rect
          x="46.5" y="54" width="3" height="4" rx="1"
          fill="white"
          opacity="0"
          animate={{ opacity: [0, 0.9] }}
          transition={{ duration: 0.3, delay: 0.45 }}
        />

        {/* AI sparks */}
        {sparks.map((s, i) => (
          <motion.circle
            key={i}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill={s.color}
            filter="url(#cfSparkGlow)"
            animate={{ opacity: [0, 1, 0], scale: [0.3, 1.4, 0.3] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
          />
        ))}
      </motion.svg>

      {showText && (
        <motion.span
          className="font-black tracking-tight leading-none"
          style={{
            fontSize: Math.max(size * 0.52, 11),
            background: "linear-gradient(135deg, #00BFFF 0%, #9370DB 55%, #FFB6C1 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          ClipForge
        </motion.span>
      )}
    </div>
  );
}