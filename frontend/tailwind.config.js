/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'banana': {
          50: '#F9F9F9', // Very light gray for backgrounds
          100: '#F0F0F0',
          500: '#111111', // Primary Black
          600: '#000000',
        },
        primary: '#111111',
        secondary: '#666666',
        accent: '#2563eb', // Electric Blue for active states
        border: '#e5e5e5',
        background: '#ffffff',
      },
      fontFamily: {
        serif: ['"Bodoni Moda"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        DEFAULT: '0px', // Sharp corners default
        'md': '0.375rem',
        'lg': '0.5rem',
        'full': '9999px',
        'card': '0px', // Explicitly override
        'panel': '0px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,0.05)',
        'md': '0 4px 6px rgba(0,0,0,0.05)',
        'lg': '0 10px 15px rgba(0,0,0,0.05)',
        'xl': '0 20px 25px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
}

