/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './renderer/**/*.{js,ts,jsx,tsx}', // 혹시 renderer 폴더 쓴다면 추가
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
