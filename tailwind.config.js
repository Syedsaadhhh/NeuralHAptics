/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#080B11',
          900: '#0D121D',
          850: '#121927',
          800: '#182235',
          750: '#202C45',
          700: '#2A3A5B',
          600: '#3D507B',
          500: '#64748B',
          400: '#94A3B8',
          300: '#CBD5E1',
          200: '#E2E8F0',
          100: '#F1F5F9',
        },
        dark: {
          950: '#080B11',
          900: '#0D121D',
          850: '#121927',
          800: '#182235',
          750: '#202C45',
          700: '#2A3A5B',
          600: '#3D507B',
        },
        haptic: {
          cyan: '#00F0FF',
          teal: '#00E5BE',
          violet: '#8B5CF6',
          purple: '#A78BFA',
          amber: '#FBBF24',
          crimson: '#FF3B69',
          green: '#10B981',
          blue: '#38BDF8',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -3px rgba(0, 240, 255, 0.35)',
        'glow-teal': '0 0 20px -3px rgba(0, 229, 190, 0.35)',
        'glow-amber': '0 0 20px -3px rgba(251, 191, 36, 0.35)',
        'glow-crimson': '0 0 20px -3px rgba(255, 59, 105, 0.35)',
        'glow-purple': '0 0 20px -3px rgba(139, 92, 246, 0.35)',
        'panel': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      }
    },
  },
  plugins: [],
}
