/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"General Sans"', 'system-ui', 'sans-serif'],
      },
      screens: {
        'xs': '375px',
      },
      colors: {
        // Chapter-specific dynamic colors using CSS custom properties
        // These will be set by ChapterThemeContext based on the current chapter
        primary: {
          DEFAULT: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          50: 'rgb(var(--color-primary-rgb) / 0.05)',
          100: 'rgb(var(--color-primary-rgb) / 0.1)',
          200: 'rgb(var(--color-primary-rgb) / 0.2)',
          300: 'rgb(var(--color-primary-rgb) / 0.3)',
          400: 'rgb(var(--color-primary-rgb) / 0.4)',
          500: 'rgb(var(--color-primary-rgb) / 0.5)',
          600: 'rgb(var(--color-primary-rgb) / 0.6)',
          700: 'rgb(var(--color-primary-rgb) / 0.7)',
          800: 'rgb(var(--color-primary-rgb) / 0.8)',
          900: 'rgb(var(--color-primary-rgb) / 0.9)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary-rgb) / <alpha-value>)',
          50: 'rgb(var(--color-secondary-rgb) / 0.05)',
          100: 'rgb(var(--color-secondary-rgb) / 0.1)',
          200: 'rgb(var(--color-secondary-rgb) / 0.2)',
          300: 'rgb(var(--color-secondary-rgb) / 0.3)',
          400: 'rgb(var(--color-secondary-rgb) / 0.4)',
          500: 'rgb(var(--color-secondary-rgb) / 0.5)',
          600: 'rgb(var(--color-secondary-rgb) / 0.6)',
          700: 'rgb(var(--color-secondary-rgb) / 0.7)',
          800: 'rgb(var(--color-secondary-rgb) / 0.8)',
          900: 'rgb(var(--color-secondary-rgb) / 0.9)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent-rgb) / <alpha-value>)',
          50: 'rgb(var(--color-accent-rgb) / 0.05)',
          100: 'rgb(var(--color-accent-rgb) / 0.1)',
          200: 'rgb(var(--color-accent-rgb) / 0.2)',
          300: 'rgb(var(--color-accent-rgb) / 0.3)',
          400: 'rgb(var(--color-accent-rgb) / 0.4)',
          500: 'rgb(var(--color-accent-rgb) / 0.5)',
          600: 'rgb(var(--color-accent-rgb) / 0.6)',
          700: 'rgb(var(--color-accent-rgb) / 0.7)',
          800: 'rgb(var(--color-accent-rgb) / 0.8)',
          900: 'rgb(var(--color-accent-rgb) / 0.9)',
        },
        mercury: {
          blue: '#5266eb',
          'blue-soft': '#eef1fd',
          surface: '#fbfcfd',
          panel: '#ffffff',
          border: 'rgba(211, 214, 219, 0.5)',
          text: '#272735',
          'text-subdued': '#535461',
        },
      },
      borderRadius: {
        DEFAULT: '0.75rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        DEFAULT: '0 2px 8px -2px rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        md: '0 4px 12px -2px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.03)',
        lg: '0 8px 24px -4px rgb(0 0 0 / 0.07), 0 4px 8px -4px rgb(0 0 0 / 0.03)',
        xl: '0 16px 40px -8px rgb(0 0 0 / 0.08), 0 8px 16px -8px rgb(0 0 0 / 0.03)',
        frosted: '0 8px 32px -4px rgb(0 0 0 / 0.05), 0 2px 8px -2px rgb(0 0 0 / 0.02)',
      },
      spacing: {
        '18': '4.5rem',
      },
    },
  },
  plugins: [],
}
