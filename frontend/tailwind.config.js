/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0B0F19',       // Deep midnight blue-black
          panel: '#151D30',    // Navy-charcoal glass panels
          panelLight: '#202B44', // Highlight panel layers
          border: '#2C3A5A'    // Sleek border lines
        },
        brand: {
          cyan: '#00E5FF',     // Vivid cyan electric accent
          cyanDark: '#00B8D4', // Deep cyan
          emerald: '#10B981',  // Success/Working Green
          amber: '#F59E0B',    // Warning/Uncertain Yellow
          rose: '#EF4444',     // Error/Broken Red
          electric: '#3B82F6'  // Queue Blue
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 15px rgba(0, 229, 255, 0.25)',
        glowGreen: '0 0 15px rgba(16, 185, 129, 0.25)',
        glowRed: '0 0 15px rgba(239, 68, 68, 0.25)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }
    },
  },
  plugins: [],
}
