/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f6fb",
          100: "#e0ecf7",
          500: "#0369A1",
          600: "#0284c7",
          700: "#0c5280",
          900: "#082f49",
        },
        secondary: {
          50: "#F0F9FF",
          100: "#e0f2fe",
          200: "#bae6fd",
        },
        accent: {
          50: "#f0fdf4",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
        },
        background: "#F8FAFC",
      },
    },
  },
}
