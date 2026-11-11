/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary:   '#B45A6D',
        secondary: '#7A2A3D',
        accent:    '#D9A6B2',
        purple:    '#7A2A3D',
        mint:      '#D9A6B2',
        orange:    '#F9F3F3',
        'green-trip': '#F9F3F3',
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'xl2': '1.25rem',
        'xl3': '1.5rem',
      },
    },
  },
  plugins: [],
}

