/** @type {import('prettier').Config} */
export default {
  singleQuote: true,
  trailingComma: 'all',
  endOfLine: 'auto',
  semi: true,
  overrides: [
    {
      files: ['frontend/**/*.{ts,tsx,js,mjs,css}', 'scripts/**/*.{js,mjs}'],
      options: { semi: false },
    },
  ],
};
