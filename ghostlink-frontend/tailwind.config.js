/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
    },
    extend: {
      colors: {
        'anon-purple': '#6e2de5',
        'burner-red': '#ff3a30',
        'ghost-dark': '#1a1a2e',
        'ghost-darker': '#16213e',
        'ghost-accent': '#0f3460',
      },
      opacity: {
        'ephemeral': '0.8',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2.5s infinite ease-in-out',
        'gradient-pan': 'gradientPan 10s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(124, 58, 237, 0.4)' },
          '50%': { boxShadow: '0 0 30px rgba(124, 58, 237, 0.8)' },
        },
        gradientPan: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
    },
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      {
        ghostlink: {
          "primary": "#7c3aed", // A more vibrant purple
          "secondary": "#ec4899", // A modern pink/magenta
          "accent": "#10b981", // A fresh teal/green
          "neutral": "#1f2937",
          "base-100": "#0f172a", // A deep, modern navy
          "base-200": "#1e293b",
          "base-300": "#0f1419",
          "info": "#3abff8",
          "success": "#36d399",
          "warning": "#fbbd23",
          "error": "#f87272",
        },
      },
      "dark",
      "cyberpunk",
    ],
    darkTheme: "ghostlink",
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: true,
    themeRoot: ":root",
  },
}
