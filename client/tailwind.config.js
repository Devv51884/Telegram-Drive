/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        drive: {
          blue: "#1a73e8",
          hover: "#e8f0fe",
          darkBg: "#1f1f1f",
          darkSurface: "#2d2e30",
          darkBorder: "#444746",
          darkHover: "#37393b"
        }
      }
    },
  },
  plugins: [],
}
