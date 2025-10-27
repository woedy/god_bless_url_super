/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#38bdf8',
          dark: '#0f172a'
        }
      }
    }
  },
  plugins: []
};
