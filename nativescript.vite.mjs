import { createRequire } from "module";

const require = createRequire(import.meta.url);

// PostCSS plugin order matters:
// 1. postcss-preset-env
//    Run this first so it only sees user-authored CSS, not Tailwind output.
//    If it runs last, its is/not-pseudo-class and cascade-layers polyfills can
//    chew on Tailwind v4's `:not(#\#)` specificity chains and silently
//    mangle utilities like `w-[400]`.
//
// 2. @tailwindcss/postcss
//    Tailwind v4 expansion. Pass `optimize: false` because this plugin enables
//    its built-in lightningcss optimizer whenever
//    `process.env.NODE_ENV === "production"`, which `vite build` sets even for
//    `mode: development` debug bundles.
//    lightningcss "normalizes" unitless values by appending `px`
//    (`width: 400` -> `width: 400px`).
//
// 3. @nativescript/tailwind
//    Apply NativeScript-specific selector/property rewrites:
//    `:root` -> `.ns-root, .ns-modal`, `rem` -> `px`, and removal of
//    unsupported declarations.
//
// 4. @csstools/postcss-is-pseudo-class
//    Flatten `:is()` and `:not()` because NativeScript's selector matcher does
//    not support `:is()` natively.
let postcssConfig = "./postcss.config.js";

try {
  const tailwindcssPostcss = require("@tailwindcss/postcss");
  const nsTailwind = require("@nativescript/tailwind");
  const postcssPresetEnv = require("postcss-preset-env");
  const postcssIsPseudoClass = require("@csstools/postcss-is-pseudo-class");

  postcssConfig = {
    plugins: [
      postcssPresetEnv(),
      tailwindcssPostcss({ optimize: false }),
      nsTailwind,
      postcssIsPseudoClass(),
    ],
  };
} catch (e) {
  console.warn(
    "[ns-tailwind] Inline PostCSS chain unavailable, falling back to ./postcss.config.js. Cause:",
    e?.message ?? e,
  );
}

export default () => ({
  css: {
    postcss: postcssConfig,
  },
});
