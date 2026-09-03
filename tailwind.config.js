/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dce6fd',
          200: '#c0d3fb',
          300: '#95b5f8',
          400: '#638cf3',
          500: '#3f66ec',
          600: '#2b49e0',
          700: '#2437ce',
          800: '#2330a7',
          900: '#212d84',
          950: '#181e50'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
        'page-enter': 'pageEnter 0.22s ease-out both'
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '0%, 100%': { opacity: '0.55' }, '50%': { opacity: '1' } },
        pageEnter: { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } }
      }
    }
  },
  plugins: []
}
