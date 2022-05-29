const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  content: ['index.js', './*/**.{html,js}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [require('daisyui')],
}
