/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#101210',
        surface: '#191D19',
        elevated: '#222822',
        text: '#F5F5EF',
        muted: '#A5ADA3',
        lime: '#C7F36B',
        moss: '#607A58',
        warm: '#D6A87C',
        line: '#303830',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.35)',
        glow: '0 0 24px rgba(199,243,107,0.15)',
      },
    },
  },
  plugins: [],
}
