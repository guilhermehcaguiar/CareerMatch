/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Syne'", 'sans-serif'],
        body:    ["'DM Sans'", 'sans-serif'],
        mono:    ["'JetBrains Mono'", 'monospace'],
      },
      colors: {
        accent: 'var(--accent)',
        accent2: 'var(--accent2)'
      }
    },
  },
  plugins: [],
}
