/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rig: {
          bg: '#0f172a',
          panel: '#1e293b',
          line: '#334155',
          accent: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
}
