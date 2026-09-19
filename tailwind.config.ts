import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "accent-warm": {
          DEFAULT: "hsl(var(--accent-warm))",
          foreground: "hsl(var(--accent-warm-foreground))",
        },
        "accent-cool": {
          DEFAULT: "hsl(var(--accent-cool))",
          foreground: "hsl(var(--accent-cool-foreground))",
        },
        chart: {
          up: "hsl(var(--chart-up))",
          down: "hsl(var(--chart-down))",
          neutral: "hsl(var(--chart-neutral))",
        },
        level: {
          high: "hsl(var(--level-high))",
          elevated: "hsl(var(--level-elevated))",
          moderate: "hsl(var(--level-moderate))",
          low: "hsl(var(--level-low))",
        },
        motion: {
          analysis: "var(--motion-analysis)",
          signal: "var(--motion-signal)",
          lens: "var(--motion-lens)",
          rail: "var(--motion-rail)",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "matchup-reveal": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "briefing-enter": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "logo-settle-away": {
          from: { opacity: "0.85", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "logo-settle-home": {
          from: { opacity: "0.85", transform: "translateX(8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "handoff-drop": {
          "0%": { opacity: "0", transform: "translateY(0)" },
          "18%": { opacity: "1" },
          "78%": { opacity: "1" },
          "100%": { opacity: "0", transform: "translateY(28px)" },
        },
        "handoff-ripple": {
          "0%, 72%": { opacity: "0", transform: "scale(0.45)" },
          "78%": { opacity: "0.35" },
          "100%": { opacity: "0", transform: "scale(1.7)" },
        },
        "handoff-chevron": {
          "0%, 68%, 100%": { color: "var(--motion-rail)" },
          "78%, 88%": { color: "var(--motion-analysis)" },
        },
        "analysis-signal": {
          "0%": { color: "var(--motion-analysis)", opacity: "0", transform: "translateX(0%)" },
          "8%": { opacity: "1" },
          "42%": { color: "var(--motion-signal)", opacity: "1", transform: "translateX(50%)" },
          "76%": { color: "var(--motion-lens)", opacity: "1", transform: "translateX(100%)" },
          "92%, 100%": { color: "var(--motion-lens)", opacity: "0", transform: "translateX(100%)" },
        },
        "return-reveal": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "returned-game": {
          "0%": { borderColor: "var(--motion-analysis)" },
          "100%": { borderColor: "hsl(var(--border))" },
        },
        "shimmer-slide": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "matchup-reveal": "matchup-reveal 0.24s ease-out both",
        "briefing-enter": "briefing-enter 0.2s ease-out both",
        "logo-settle-away": "logo-settle-away 0.2s ease-out both",
        "logo-settle-home": "logo-settle-home 0.2s ease-out both",
        "handoff-drop": "handoff-drop 0.7s ease-out both",
        "handoff-ripple": "handoff-ripple 0.7s ease-out both",
        "handoff-chevron": "handoff-chevron 0.7s ease-out both",
        "analysis-signal": "analysis-signal 3.6s ease-in-out infinite",
        "return-reveal": "return-reveal 0.16s ease-out both",
        "returned-game": "returned-game 0.8s ease-out both",
        "shimmer-slide": "shimmer-slide 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
