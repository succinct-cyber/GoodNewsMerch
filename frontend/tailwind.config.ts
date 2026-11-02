import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        black:      '#0A0A0A',
        text:       '#1A1C1C',
        'text-sub': '#474747',
        'text-body':'#4B5563',
        'text-muted':'#6B7280',
        border:     '#E2E2E2',
        'card-bg':  '#F3F3F4',
        'section-bg':'#F3F4F6',
        'page-bg':  '#F9F9F9',
        accent:     '#FF8800',
        success:    '#04B804',
        danger:     '#FF0000',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      letterSpacing: {
        widest2: '0.15em',
        widest3: '0.2em',
      },
      boxShadow: {
        sm:  '0 2px 12px rgba(0,0,0,0.06)',
        md:  '0 4px 24px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
}
export default config
