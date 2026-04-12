import { createRequire } from "module";
const require = createRequire(import.meta.url);

let postcssConfig = "./postcss.config.js";

try {
  const twV4 = require("@tailwindcss/postcss");
  const nsTailwind = require("@nativescript/tailwind");
  const postCssOklabFunction = require('@csstools/postcss-oklab-function');
  postcssConfig = { plugins: [twV4, nsTailwind, postCssOklabFunction({ preserve: false })] };
} catch (e2) {
  console.warn(
    "Inline PostCSS unavailable, falling back to ./postcss.config.js"
  );
}

export default () => {
  return {
    css: {
      postcss: postcssConfig,
    },
  };
};
