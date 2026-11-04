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
          DEFAULT: '#70283F',
          hover: '#592032',
          light: '#F7E9EC',
          subtle: '#F1DDE2',
        },
        accent: {
          DEFAULT: '#E9874E',
          hover: '#CF6F39',
          light: '#FFF0E5',
        },
        surface: {
          50: '#FFF7ED',
          100: '#F8EEE3',
          200: '#E9DCCF',
          300: '#D8C7B8',
        },
        ink: {
          DEFAULT: '#30252A',
        },
        stone: {
          50: '#FBF5EE', 100: '#F4EAE0', 200: '#E7D9CC', 300: '#D5C3B4',
          400: '#AA9688', 500: '#88766B', 600: '#6D5B52', 700: '#51413C',
          800: '#3D302F', 900: '#30252A', 950: '#241C20',
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
