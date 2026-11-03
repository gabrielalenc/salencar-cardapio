/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#114434', // Verde nobre Salencar
          hover: '#0c3528',
          light: '#f2f7f4',
          subtle: '#e4efe9',
        },
        accent: {
          DEFAULT: '#c27e1f', // Ouro queimado / âmbar discreto
          hover: '#a86c18',
          light: '#fdf7ee',
        },
        surface: {
          50: '#fbfaf8',
          100: '#f4f2ee',
          200: '#e7e4dc',
          300: '#d5d0c5',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Outfit', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.06), 0 1px 4px -1px rgba(0, 0, 0, 0.04)',
        'elevated': '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
