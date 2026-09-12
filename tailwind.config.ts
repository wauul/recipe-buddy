import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: { colors: { cream: '#faf8f3', ink: '#283b2e', leaf: '#396449', peach: '#f4e6d7' } } },
  plugins: []
} satisfies Config;
