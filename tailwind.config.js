/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Canvas
        slate: '#AAB2BE',
        slateDeep: '#969FAC',
        // Panels
        panel: '#59636B',
        charcoal: '#262C35',
        // Light surfaces
        ice: '#E9EEF2',
        iceLow: '#D7DFE6',
        // Text
        ink: '#222A33',
        text: '#F4F6F8',
        muted: '#727D88',
        // Accents
        neon: '#F4FF00',
        acid: '#D9FF65',
        amber: '#FFB43D',
        rose: '#F43F5E',
        // Borders
        line: 'rgba(255,255,255,0.45)',
        lineDark: 'rgba(34,42,51,0.10)',
      },
      fontFamily: {
        sans: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
        display: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        // Layered ambient shadows for floating panels
        panel: '0 24px 60px -24px rgba(18,24,31,0.38), 0 4px 12px rgba(18,24,31,0.12), inset 0 1px 0 rgba(255,255,255,0.14)',
        raise: '0 34px 70px -26px rgba(18,24,31,0.48), 0 6px 16px rgba(18,24,31,0.16), inset 0 1px 0 rgba(255,255,255,0.18)',
        chip: '0 2px 8px rgba(18,24,31,0.10)',
        neonGlow: '0 4px 18px rgba(244,255,0,0.38)',
      },
    },
  },
  plugins: [],
}
