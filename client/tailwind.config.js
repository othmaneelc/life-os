/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'apple-bg': 'var(--bg-primary)',
        'apple-surface': 'var(--bg-surface)',
        'apple-card': 'var(--bg-card)',
        'apple-elevated': 'var(--bg-elevated)',
        'apple-tab': 'var(--bg-tab-active)',
        'apple-sidebar': 'var(--bg-sidebar)',
        'apple-text': 'var(--text-primary)',
        'apple-muted': 'var(--text-muted)',
        'apple-tertiary': 'var(--text-tertiary)',
        'apple-border': 'var(--border-color)',
        'apple-blue': 'var(--accent)',
        'apple-accent': 'var(--accent)',
        'apple-green': 'var(--success)',
        'apple-amber': 'var(--warning)',
        'apple-red': 'var(--danger)',
        'apple-purple': 'var(--purple)',
        'apple-glass': 'var(--bg-glass)',
        'apple-glass-border': 'var(--border-glass)',
        'apple-heatmap-1': 'var(--heatmap-1)',
        'apple-heatmap-2': 'var(--heatmap-2)',
        'apple-heatmap-3': 'var(--heatmap-3)',
        'apple-heatmap-4': 'var(--heatmap-4)',
      },
      fontFamily: {
        sans: [
          '"Inter"', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"',
          '"Segoe UI"', 'Roboto', 'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"', '"SF Mono"', '"Fira Code"', 'monospace',
        ],
      },
      fontSize: {
        'micro': '12px',
        'small': '13px',
        'body': '14px',
        'subheading': '16px',
        'heading': '20px',
        'hero': '28px',
      },
      borderRadius: {
        'card': '10px',
        'input': '8px',
        'badge': '6px',
      },
      boxShadow: {
        'apple': 'var(--shadow-card)',
        'apple-hover': 'var(--shadow-card-hover)',
        'glow': 'var(--shadow-glow)',
      },
    },
  },
  plugins: [],
}
