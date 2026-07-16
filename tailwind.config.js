/** @type {import('tailwindcss').Config} */
export default {
  // Precisa varrer os módulos JS também: várias classes só aparecem dentro de
  // template strings (tabelas, alertas, indicador de senha). Se o JS ficar de
  // fora, essas classes somem do CSS compilado.
  content: ["./src/**/*.html", "./src/js/**/*.js"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(99,102,241,0.2), 0 8px 40px -8px rgba(99,102,241,0.5)",
        "glow-sm": "0 4px 20px -4px rgba(99,102,241,0.4)",
        glass: "0 4px 32px -8px rgba(99,102,241,0.18), 0 1px 0 rgba(255,255,255,0.9) inset",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
