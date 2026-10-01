/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#004357',
        accent: '#0D5C75',
        accentWash: '#E6F4F7',
        surface: '#f9f9ff',
        ink: '#141b2b',
        muted: '#40484c',
        faint: '#9CA3AF',
        hairline: '#E5E7EB',
        whatsapp: '#25D366',
        error: '#ba1a1a',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      letterSpacing: {
        caps: '0.12em',
      },
      boxShadow: {
        airy: '0 2px 8px -2px rgba(17, 24, 39, 0.04), 0 1px 4px -1px rgba(17, 24, 39, 0.02)',
        float: '0 16px 32px -8px rgba(17, 24, 39, 0.08)',
      },
    },
  },
  plugins: [],
};
