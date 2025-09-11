import { createRequire } from "module";
const require = createRequire(import.meta.url);

let postcssConfig = "./postcss.config.js";

try {
  const tailwind = require("tailwindcss");
  const nsTailwind = require("@nativescript/tailwind");
  postcssConfig = { plugins: [tailwind, nsTailwind] };
} catch (err) {
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
