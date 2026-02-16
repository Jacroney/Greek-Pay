export const colors = {
  primary: {
    50: '#eef1fd',
    100: '#dde3fb',
    200: '#bbc7f7',
    300: '#99abf3',
    400: '#778fef',
    500: '#5266eb',
    600: '#3d4fd6',
    700: '#2e3ba1',
    800: '#1f286c',
    900: '#0f1437',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  gray: {
    50: '#fbfcfd',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d3d6db',
    400: '#9ca3af',
    500: '#535461',
    600: '#3f4050',
    700: '#333442',
    800: '#272735',
    900: '#1a1a24',
  }
};

export const spacing = {
  xs: '0.5rem',
  sm: '0.75rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
};

export const borderRadius = {
  none: '0',
  sm: '0.5rem',
  DEFAULT: '0.75rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '2.5rem',
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
  DEFAULT: '0 2px 8px -2px rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
  md: '0 4px 12px -2px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.03)',
  lg: '0 8px 24px -4px rgb(0 0 0 / 0.07), 0 4px 8px -4px rgb(0 0 0 / 0.03)',
  xl: '0 16px 40px -8px rgb(0 0 0 / 0.08), 0 8px 16px -8px rgb(0 0 0 / 0.03)',
};

export const transitions = {
  all: 'all 150ms ease',
  colors: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease',
  opacity: 'opacity 150ms ease',
  transform: 'transform 150ms ease',
  shadow: 'box-shadow 150ms ease',
};

export const componentStyles = {
  // Card styles
  card: `
    bg-white/80 backdrop-blur-xl
    rounded-lg
    shadow-md hover:shadow-lg
    transition-shadow duration-150
    p-6
  `,

  // Button styles
  button: {
    base: `
      px-4 py-2.5
      rounded-lg
      font-medium
      transition-all duration-150
      inline-flex items-center justify-center gap-2
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    primary: `
      bg-primary hover:bg-primary-800
      text-white
      focus:ring-primary
      shadow-sm hover:shadow-md
    `,
    secondary: `
      bg-gray-200 hover:bg-gray-300
      text-gray-900
      focus:ring-gray-500
    `,
    success: `
      bg-green-600 hover:bg-green-700
      text-white
      focus:ring-green-500
      shadow-sm hover:shadow-md
    `,
    danger: `
      bg-red-600 hover:bg-red-700
      text-white
      focus:ring-red-500
      shadow-sm hover:shadow-md
    `,
    ghost: `
      bg-transparent hover:bg-gray-100
      text-gray-700
      focus:ring-gray-500
    `,
  },

  // Input styles
  input: `
    w-full
    px-4 py-2.5
    border border-gray-300
    rounded-lg
    bg-white
    text-gray-900
    placeholder-gray-400
    focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
    transition-all duration-150
    hover:border-gray-400
  `,

  // Select styles
  select: `
    w-full
    px-4 py-2.5
    border border-gray-300
    rounded-lg
    bg-white
    text-gray-900
    focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
    transition-all duration-150
    hover:border-gray-400
    cursor-pointer
  `,

  // Label styles
  label: `
    block
    text-sm font-medium
    text-gray-700
    mb-1.5
  `,

  // Heading styles
  heading: {
    h1: 'text-3xl font-bold text-gray-900',
    h2: 'text-2xl font-bold text-gray-900',
    h3: 'text-xl font-semibold text-gray-900',
    h4: 'text-lg font-semibold text-gray-900',
  },

  // Text styles
  text: {
    body: 'text-gray-700',
    muted: 'text-gray-500',
    small: 'text-sm text-gray-600',
  },

  // Table styles
  table: {
    container: 'overflow-x-auto rounded-lg shadow-sm',
    table: 'min-w-full divide-y divide-gray-200',
    thead: 'bg-gray-50',
    th: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
    tbody: 'bg-white divide-y divide-gray-200',
    td: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
    row: 'hover:bg-gray-50 transition-colors duration-150',
  },

  // Modal styles
  modal: {
    overlay: 'fixed inset-0 bg-[var(--brand-text)]/40 backdrop-blur-sm transition-opacity',
    container: 'fixed inset-0 z-50 overflow-y-auto',
    content: 'bg-white rounded-xl shadow-xl max-w-lg mx-auto mt-20 p-6',
  },

  // Badge styles
  badge: {
    base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    primary: 'bg-primary-100 text-primary-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800',
  },

  // Alert styles
  alert: {
    base: 'p-4 rounded-lg flex items-start gap-3',
    info: 'bg-primary-50 text-primary-900 border border-primary-200',
    success: 'bg-green-50 text-green-900 border border-green-200',
    warning: 'bg-yellow-50 text-yellow-900 border border-yellow-200',
    danger: 'bg-red-50 text-red-900 border border-red-200',
  },
};

// Utility function to combine class names
export const cn = (...classes: (string | undefined | null | boolean)[]) => {
  return classes.filter(Boolean).join(' ');
};
