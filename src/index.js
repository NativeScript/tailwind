const postcss = require("postcss");

module.exports = postcss([
  require("./removeUnsupported"),
  require("./expandAnimations"),
]);
