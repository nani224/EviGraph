/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary navy background
        navy: {
          950: "#030712",
          900: "#0a0f1e",
          800: "#0d1526",
          700: "#111d35",
          600: "#162344",
          500: "#1c2d54",
        },
        // Cyan/blue accents
        accent: {
          50:  "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
        },
        // Status colors
        danger:  { DEFAULT: "#ef4444", light: "#fca5a5", dark: "#b91c1c" },
        warning: { DEFAULT: "#f59e0b", light: "#fcd34d", dark: "#b45309" },
        success: { DEFAULT: "#10b981", light: "#6ee7b7", dark: "#065f46" },
        info:    { DEFAULT: "#3b82f6", light: "#93c5fd", dark: "#1d4ed8" },
        // Glass surface
        surface: {
          DEFAULT: "rgba(13,21,38,0.85)",
          light:   "rgba(22,35,68,0.6)",
          border:  "rgba(34,211,238,0.12)",
          hover:   "rgba(34,211,238,0.08)",
        },
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(34,211,238,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.03) 1px,transparent 1px)",
        "card-gradient":
          "linear-gradient(135deg,rgba(13,21,38,0.95) 0%,rgba(22,35,68,0.85) 100%)",
        "accent-gradient":
          "linear-gradient(135deg,#06b6d4 0%,#3b82f6 100%)",
        "danger-gradient":
          "linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)",
        "warning-gradient":
          "linear-gradient(135deg,#f59e0b 0%,#b45309 100%)",
        "success-gradient":
          "linear-gradient(135deg,#10b981 0%,#065f46 100%)",
      },
      backgroundSize: {
        "grid": "32px 32px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        "glow-cyan": "0 0 20px rgba(6,182,212,0.15), 0 0 40px rgba(6,182,212,0.08)",
        "glow-blue": "0 0 20px rgba(59,130,246,0.15), 0 0 40px rgba(59,130,246,0.08)",
        "glow-red":  "0 0 20px rgba(239,68,68,0.2)",
        "card":      "0 1px 3px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)",
        "card-hover":"0 4px 16px rgba(0,0,0,0.6), 0 0 0 1px rgba(34,211,238,0.15)",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "fade-in":    "fadeIn 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "slide-in-left":  "slideInLeft 0.3s ease-out",
        "slide-up":   "slideUp 0.3s ease-out",
        "count-up":   "countUp 1s ease-out",
        "draw-line":  "drawLine 0.8s ease-out",
        "scan":       "scan 2s linear infinite",
        "blink":      "blink 1.5s ease-in-out infinite",
        "spin-slow":  "spin 4s linear infinite",
      },
      keyframes: {
        fadeIn:       { from: { opacity: "0" },              to: { opacity: "1" } },
        slideInRight: { from: { transform: "translateX(20px)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
        slideInLeft:  { from: { transform: "translateX(-20px)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
        slideUp:      { from: { transform: "translateY(10px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        drawLine:     { from: { "stroke-dashoffset": "1000" }, to: { "stroke-dashoffset": "0" } },
        scan:         { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(100%)" } },
        blink:        { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.3" } },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
