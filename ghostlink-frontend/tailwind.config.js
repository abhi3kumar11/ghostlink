/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
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
        'pulse-glow': 'pulseGlow 2s infinite',
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
          '0%, 100%': { boxShadow: '0 0 5px rgba(110, 45, 229, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(110, 45, 229, 0.8)' },
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
          "primary": "#6e2de5",
          "secondary": "#ff3a30", 
          "accent": "#0f3460",
          "neutral": "#1a1a2e",
          "base-100": "#16213e",
          "base-200": "#1a1a2e",
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

