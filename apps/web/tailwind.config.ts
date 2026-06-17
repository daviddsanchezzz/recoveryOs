import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f0ebe0',
        'canvas-light': '#f8f5ee',
        ink: '#13201a',
        moss: '#54715a',
        'moss-light': '#e8ede9',
        sand: '#d9c4a1',
        'sand-light': '#f2ead8',
        ember: '#b56b45',
        'ember-light': '#f5e8e0',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 16px rgba(19, 32, 26, 0.06), 0 1px 4px rgba(19, 32, 26, 0.04)',
        'card-lg': '0 8px 32px rgba(19, 32, 26, 0.10), 0 2px 8px rgba(19, 32, 26, 0.06)',
        'bottom-nav': '0 -1px 0 rgba(19, 32, 26, 0.08), 0 -4px 20px rgba(19, 32, 26, 0.04)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      keyframes: {
        'slide-up': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
