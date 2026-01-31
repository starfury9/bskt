import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        basket: {
          primary: "#6366f1",
          secondary: "#8b5cf6",
          accent: "#f59e0b",
          dark: "#1e1b4b",
          light: "#f5f3ff",
        },
      },
    },
  },
  plugins: [],
};
export default config;
