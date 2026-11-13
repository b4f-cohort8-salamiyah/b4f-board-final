import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        status: {
          todo: "#6b7280",
          "in-progress": "#2563eb",
          review: "#d97706",
          done: "#16a34a",
        },
        priority: {
          low: "#6b7280",
          medium: "#2563eb",
          high: "#ea580c",
          urgent: "#dc2626",
        },
      },
    },
  },
  plugins: [],
};

export default config;
