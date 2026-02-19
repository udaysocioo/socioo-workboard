/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6', // blue-500
        secondary: '#64748b', // slate-500
        success: '#22c55e', // green-500
        warning: '#eab308', // yellow-500
        danger: '#ef4444', // red-500
        dark: {
          900: '#0f172a', // slate-900
          800: '#1e293b', // slate-800
          700: '#334155', // slate-700
        },
      },
    },
  },
  plugins: [],
};
