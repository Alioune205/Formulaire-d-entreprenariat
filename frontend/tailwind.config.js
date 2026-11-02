/** Thème tiré du logo CIAT : marron profond + caramel. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brun: {
          50: '#faf6f3',
          100: '#f2e9e2',
          200: '#e3d0c1',
          300: '#cfae95',
          400: '#b98a6a',
          500: '#a06e4e',
          600: '#7f5239',
          700: '#5f3b28',
          800: '#4a2c1e',
          900: '#331e14',
        },
        caramel: {
          100: '#f6e9dc',
          200: '#ecd2b8',
          300: '#ddb28c',
          400: '#cf9a6c',
          500: '#c08457',
          600: '#a66c42',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
