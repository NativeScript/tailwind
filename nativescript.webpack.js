/**
 * @param {typeof import("@nativescript/webpack")} webpack
 */
module.exports = (webpack) => {
  const shouldAutoload = webpack.Utils.config.getValue('tailwind.autoload', true);

  if(!shouldAutoload) {
    return;
  }

  const addPostCSSPlugins = (options = {}) => {
    const { merge } = require("webpack-merge");

    return merge(options, {
      postcssOptions: {
        plugins: ["tailwindcss", "@nativescript/tailwind"],
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
