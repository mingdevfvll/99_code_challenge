import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "475px",
      },
      colors: {
        primary: "var(--color-primary)",
        "primary-foreground": "hsl(var(--primary-foreground))",
        bg: "var(--color-bg)",
        fg: "var(--color-fg)",
        muted: "var(--color-muted)",
        "muted-foreground": "hsl(var(--muted-foreground))",
        "muted-fg": "var(--color-muted-fg)",
        surface: "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
        success: "var(--color-success)",
        error: "var(--color-error)",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        sans: ["sans-serif"],
        mono: ['"Silkscreen"', "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "loader-cube-spin": {
          "0%": { transform: "rotateY(0deg) rotateX(0deg)" },
          "80%": { transform: "rotateY(360deg) rotateX(360deg)" },
          "100%": { transform: "rotateY(360deg) rotateX(360deg)" },
        },
      },
      animation: {
        "loader-cube":
          "loader-cube-spin 4s ease-in-out 0.5s infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
