const remRE = /\d?\.?\d+\s*r?em/g;

function isSupportedProperty(prop, val = null) {
  const rules = supportedProperties[prop];
  if (!rules) return false;

  if (val) {
    if (unsupportedValues.some((unit) => val.endsWith(unit))) {
      return false;
    }

    if (Array.isArray(rules)) {
      return rules.includes(val);
    }
  }

  return true;
}

function isSupportedSelector(selector) {
  const hasUnsupportedPseudoSelector = unsupportedPseudoSelectors.some(
    (pseudo) => selector.includes(pseudo)
  );

  return !hasUnsupportedPseudoSelector;
}

function isPlaceholderPseudoSelector(selector) {
  return selector.includes("::placeholder");
}

/**
 * @param {@} options
 * @returns {import('postcss').Plugin}
 */
module.exports = (options = { debug: false }) => {
  return {
    postcssPlugin: "postcss-nativescript",
    AtRule: {
      // remove @media rules because they
      // are currently not supported
      // in NativeScript
      media(mediaAtRule) {
        mediaAtRule.remove();
      },
    },
    Rule(rule) {
      // remove empty rules
      if (rule.nodes.length === 0) {
        return rule.remove();
      }

      // remove rules with unsupported selectors
      if (!isSupportedSelector(rule.selector)) {
        return rule.remove();
      }

      // convert ::placeholder pseudo selector
      // to use placeholder-color declaration
      if (isPlaceholderPseudoSelector(rule.selector)) {
        const placeholderSelectors = [];
        rule.selectors.forEach((selector) => {
          if (isPlaceholderPseudoSelector(selector)) {
            placeholderSelectors.push(selector.replace(/::placeholder/g, ""));
          }
        });
        if (placeholderSelectors.length) {
          rule.selectors = placeholderSelectors;
          rule.walkDecls((decl) => {
            if (decl.prop === "color") {
              decl.replaceWith(decl.clone({ prop: "placeholder-color" }));
            }
          });
        }
        // rule.selector.replace('::placeholder', '')
      }

      // remove :where() pseudo selector, introduced in Tailwind 3.4.
      if (rule.selector.includes(":where(")) {
        rule.selectors = rule.selectors.map((selector) =>
          selector.replace(/:where\((.+)\)/, "$1")
        );
      }

      // replace space and divide selectors to use a simpler selector that works in ns
      if (rule.selector.includes(":not([hidden]) ~ :not([hidden])")) {
        rule.selectors = rule.selectors.map((selector) => {
          return selector.replace(":not([hidden]) ~ :not([hidden])", "* + *");
        });
      }
    },
    Declaration(decl) {
      // replace visibility: hidden
      // with    visibility: collapse
      if (decl.prop === "visibility") {
        switch (decl.value) {
          case "hidden":
            return decl.replaceWith(decl.clone({ value: "collapse" }));
        }
      }

      // replace vertical-align: middle
      // with    vertical-align: center
      if (decl.prop === "vertical-align") {
        switch (decl.value) {
          case "middle":
            return decl.replaceWith(decl.clone({ value: "center" }));
        }
      }

      // declarations that define unsupported variables/rules
      if (
        [
          "tw-ring",
          "tw-shadow",
          "tw-ordinal",
          "tw-slashed-zero",
          "tw-numeric",
        ].some((varName) => decl.prop.startsWith(`--${varName}`))
      ) {
        return decl.remove();
      }

      // Convert em/rem values to device pixel values
      // assuming 16 as the basis for rem and
      // treating em as rem
      if (decl.value.includes("rem") || decl.value.includes("em")) {
        decl.value = decl.value.replace(remRE, (match, offset, value) => {
          const converted = "" + parseFloat(match) * 16;

          options.debug &&
            console.log("replacing r?em value", {
              match,
              offset,
              value,
              converted,
            });

          return converted;
        });
        options.debug &&
          console.log({
            final: decl.value,
          });
      }

      // remove unsupported properties
      if (
        !decl.prop.startsWith("--") &&
        !isSupportedProperty(decl.prop, decl.value)
      ) {
        // options.debug && console.log('removing ', decl.prop, decl.value)
        return decl.remove();
      }
    },
  };
};
module.exports.postcss = true;

const supportedProperties = {
  "align-content": true,
  "align-items": true,
  "align-self": true,
  "android-selected-tab-highlight-color": true,
  "android-elevation": true,
  "android-dynamic-elevation-offset": true,
  animation: true,
  "animation-delay": true,
  "animation-direction": true,
  "animation-duration": true,
  "animation-fill-mode": true,
  "animation-iteration-count": true,
  "animation-name": true,
  "animation-timing-function": true,
  background: true,
  "background-color": true,
  "background-image": true,
  "background-position": true,
  "background-repeat": ["repeat", "repeat-x", "repeat-y", "no-repeat"],
  "background-size": true,
  "border-bottom-color": true,
  "border-bottom-left-radius": true,
  "border-bottom-right-radius": true,
  "border-bottom-width": true,
  "border-color": true,
  "border-left-color": true,
  "border-left-width": true,
  "border-radius": true,
  "border-right-color": true,
  "border-right-width": true,
  "border-top-color": true,
  "border-top-left-radius": true,
  "border-top-right-radius": true,
  "border-top-width": true,
  "border-width": true,
  "box-shadow": true,
  "clip-path": true,
  color: true,
  flex: true,
  "flex-grow": true,
  "flex-direction": true,
  "flex-shrink": true,
  "flex-wrap": true,
  font: true,
  "font-family": true,
  "font-size": true,
  "font-style": ["italic", "normal"],
  "font-weight": true,
  height: true,
  "highlight-color": true,
  "horizontal-align": ["left", "center", "right", "stretch"],
  "justify-content": true,
  "justify-items": true,
  "justify-self": true,
  "letter-spacing": true,
  "line-height": true,
  margin: true,
  "margin-bottom": true,
  "margin-left": true,
  "margin-right": true,
  "margin-top": true,
  "min-height": true,
  "min-width": true,
  "off-background-color": true,
  opacity: true,
  order: true,
  padding: true,
  "padding-bottom": true,
  "padding-left": true,
  "padding-right": true,
  "padding-top": true,
  "place-content": true,
  "placeholder-color": true,
  "place-items": true,
  "place-self": true,
  "selected-tab-text-color": true,
  "tab-background-color": true,
  "tab-text-color": true,
  "tab-text-font-size": true,
  "text-transform": true,
  "text-align": ["left", "center", "right"],
  "text-decoration": ["none", "line-through", "underline"],
  "text-shadow": true,
  "text-transform": ["none", "capitalize", "uppercase", "lowercase"],
  transform: true,
  "vertical-align": ["top", "center", "bottom", "stretch"],
  visibility: ["visible", "collapse"],
  width: true,
  "z-index": true,
};

const unsupportedPseudoSelectors = [":focus-within", ":hover"];
const unsupportedValues = ["max-content", "min-content", "vh", "vw"];
