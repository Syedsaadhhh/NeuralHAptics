/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#07090D',
          900: '#0B0E14',
          850: '#10141D',
          800: '#161B26',
          750: '#1C2331',
          700: '#242C3D',
          600: '#333F54',
        },
        haptic: {
          cyan: '#00E5FF',
          violet: '#7C4DFF',
          amber: '#FFB300',
          crimson: '#FF466C',
          green: '#00E676',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
