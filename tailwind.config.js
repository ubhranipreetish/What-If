/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // Full screen set (Tailwind defaults + a custom `xs`). Declared directly in
    // `theme.screens` rather than `extend.screens` so `xs` (min-width:400px) is
    // ordered BEFORE `sm` in the generated cascade. If it were appended after
    // sm/md/lg, its media query would win at larger widths and silently break
    // the intended mobile-first overrides. The app already ships ~16 `xs:`
    // utilities that were inert until this breakpoint existed.
    screens: {
      xs: "400px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {},
  },
  plugins: [],
}
