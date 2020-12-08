const postcss = require("postcss");
const { parseSingle, serialize } = require("@hookun/parse-animation-shorthand");

module.exports = (options = { debug: false }) => {
  return {
    postcssPlugin: "postcss-nativescript-animations",
    Declaration(decl) {
      // replace animation: *
      // with    animation-*:
      if (decl.prop === "animation") {
        const styles = parseSingle(decl.value);
        Object.entries(styles)
          .filter(([, value]) => typeof value === "object")
          .map(([key, value]) => [
            key,
            serialize({ [key]: value }).split(" ")[0],
          ])
          .map(([key, value]) => (styles[key] = value));

        Object.entries(styles)
          .filter(([, value]) => value !== "unset")
          .map(([key, value]) =>
            decl.parent.insertAfter(
              decl,
              decl.clone({
                prop: `animation-${camelToKebab(key)}`,
                value: `${value}`,
              })
            )
          );

        decl.remove();
      }
    },
  };
};
module.exports.postcss = true;

function camelToKebab(input) {
  return input.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}
