import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f4efe7',
        ink: '#13201a',
        moss: '#54715a',
        sand: '#d9c4a1',
        ember: '#b56b45',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

