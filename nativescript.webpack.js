/**
 * @param {typeof import("@nativescript/webpack")} webpack
 */
module.exports = (webpack) => {
  const shouldAutoload = webpack.Utils.config.getValue('tailwind.autoload', true);

  if(!shouldAutoload) {
    return;
  }

  const addPostCSSPlugins = (options = {}) => {
    return webpack.merge(options, {
      postcssOptions: {
        plugins: [
          "postcss-preset-env", 
          "@tailwindcss/postcss", 
          "@nativescript/tailwind", 
          "@csstools/postcss-is-pseudo-class", 
          [
            "@csstools/postcss-color-mix-function",
            { preserve: false },
          ]
        ],
      },
    });
  };

  webpack.chainWebpack((config) => {
    config.module
      .rule("css")
      .use("postcss-loader")
      .tap(addPostCSSPlugins);

    config.module
      .rule("scss")
      .use("postcss-loader")
      .tap(addPostCSSPlugins);
  });
};
