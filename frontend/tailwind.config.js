/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          900: '#151413',
          800: '#211F1C',
          700: '#2A2724',
          600: '#3D3934',
        },
        cream: {
          50: '#FDFBF7',
          100: '#F7F5F0',
          200: '#EEE6DB',
          300: '#E5DCCD',
        },
        gold: {
          DEFAULT: '#C49A6C',
          light: '#dfb76c',
          dark: '#a87e50',
          50: '#FBF7F0',
          100: '#F4EAD8',
          200: '#E7D1AE',
          500: '#C49A6C',
          600: '#B08557',
        },
        steel: {
          border: '#E5E2DE',
          muted: '#71717A',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'premium': '0 4px 20px -2px rgba(33, 31, 28, 0.08), 0 2px 6px -1px rgba(33, 31, 28, 0.04)',
        'gold-glow': '0 4px 14px 0 rgba(196, 154, 108, 0.25)',
      }
    },
  },
  plugins: [],
}

