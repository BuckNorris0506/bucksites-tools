import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        bp: {
          bg: "var(--bp-bg)",
          surface: "var(--bp-surface)",
          border: "var(--bp-border)",
          text: "var(--bp-text)",
          muted: "var(--bp-muted)",
          trust: "var(--bp-trust)",
          "trust-soft": "var(--bp-trust-soft)",
          caution: "var(--bp-caution)",
          "caution-soft": "var(--bp-caution-soft)",
          success: "var(--bp-success)",
          "success-soft": "var(--bp-success-soft)",
          block: "var(--bp-block)",
          "block-soft": "var(--bp-block-soft)",
          code: {
            bg: "var(--bp-code-bg)",
            border: "var(--bp-code-border)",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
