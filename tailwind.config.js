/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pastel: {
          cream: '#f8f7f4',
          creamDark: '#111317',
          card: '#ffffff',
          cardDark: '#1a1d24',
          rose: '#f5e6e8',
          roseDark: '#382227',
          sage: '#e2efe9',
          sageDark: '#1e332a',
          lavender: '#e8e5f2',
          lavenderDark: '#262238',
          accent: '#967aa1',
          accentHover: '#80628b',
          gold: '#f7edda',
          goldDark: '#3a321f',
          textPrimary: '#2b2d42',
          textPrimaryDark: '#eceef5',
          textSecondary: '#6c757d',
          textSecondaryDark: '#9ba3af',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
