/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Couleurs extraites du web (HSL converties en hex)
        primary: {
          DEFAULT: '#8B1A2B',
          foreground: '#FFFFFF',
        },
        background: '#F5F7FA',
        foreground: '#1A1F2E',
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#1A1F2E',
        },
        border: '#E5E9F0',
        input: '#E5E9F0',
        muted: {
          DEFAULT: '#F0F3F6',
          foreground: '#64748B',
        },
        secondary: {
          DEFAULT: '#F0F3F6',
          foreground: '#1A1F2E',
        },
        accent: {
          DEFAULT: '#F0F3F6',
          foreground: '#1A1F2E',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        ring: '#8B1A2B',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
        '3xl': '22px',
        '4xl': '26px',
      },
    },
  },
  plugins: [],
};
