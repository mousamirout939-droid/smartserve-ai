/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        char: {
          950: '#0F0D0B',
          900: '#14110F',
          800: '#1D1915',
          700: '#262019',
          600: '#332B22',
          500: '#4A3E30',
        },
        cream: '#F5F1E8',
        muted: '#A39A8C',
        gold: {
          400: '#E8BE3F',
          500: '#D4A017',
          600: '#B08312',
        },
        sauce: '#C4432E',
        herb: '#5F7A52',
      },
      fontFamily: {
        display: ['"Newsreader"', 'serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
