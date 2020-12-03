const postcss = require('postcss')

const remRE = /\d?\.?\d+\s*r?em/g

function isSupportedProperty(prop, val = null) {
  const rules = supportedProperties[prop]
  if (!rules) return false

  if (val) {
    if (unsupportedValues.some(unit => val.endsWith(unit))) {
      return false
    }

    if (Array.isArray(rules)) {
      return rules.includes(val)
    }
  }

  return true
}

function isSupportedSelector(selector) {
  const hasUnsupportedPseudoSelector = unsupportedPseudoSelectors.some(pseudo => selector.includes(pseudo))

  return !hasUnsupportedPseudoSelector;
}

function isPlaceholderPseudoSelector(selector) {
  return selector.includes('::placeholder')
}

module.exports = (options = {debug: false}) => {
  return {
    postcssPlugin: 'postcss-nativescript',
    AtRule: {
      // remove @media rules because they
      // are currently not supported
      // in NativeScript
      media(mediaAtRule) {
        mediaAtRule.remove()
      }
    },
    Rule(rule) {
      // remove empty rules
      if (rule.nodes.length === 0) {
        rule.remove()
      }

      // remove rules with unsupported selectors
      if (!isSupportedSelector(rule.selector)) {
        rule.remove()
      }

      // convert ::placeholder pseudo selector
      // to use placeholder-color declaration
      if (isPlaceholderPseudoSelector(rule.selector)) {
        const placeholderSelectors = []
        rule.selectors.forEach(selector => {
          if (isPlaceholderPseudoSelector(selector)) {
            placeholderSelectors.push(selector.replace(/::placeholder/g, ''))
          }
        })
        if (placeholderSelectors.length) {
          rule.selectors = placeholderSelectors
          rule.walkDecls(decl => {
            if (decl.prop === 'color') {
              decl.replaceWith(decl.clone({prop: 'placeholder-color'}))
            }
          })
        }
        // rule.selector.replace('::placeholder', '')
      }

      // replace space and divide selectors to use a simpler selector that works in ns
      if (rule.selector.includes(':not([hidden]) ~ :not([hidden])')) {
        rule.selectors = rule.selectors.map(selector => {
          return selector.replace(':not([hidden]) ~ :not([hidden])', '* + *')
        })
      }
    },
    Declaration(decl) {
      // replace visibility: hidden
      // with    visibility: collapse
      if (decl.prop === 'visibility') {
        switch (decl.value) {
          case 'hidden':
            decl.replaceWith(decl.clone({value: 'collapse'}))
            return
        }
      }

      // replace vertical-align: middle
      // with    vertical-align: center
      if (decl.prop === 'vertical-align') {
        switch (decl.value) {
          case 'middle':
            decl.replaceWith(decl.clone({value: 'center'}))
            return
        }
      }

      // declarations that define unsupported variables/rules
      if ([
        'tw-ring',
        'tw-shadow',
        'tw-ordinal',
        'tw-slashed-zero',
        'tw-numeric'
      ].some(varName => decl.prop.startsWith(`--${varName}`))) {
        decl.remove()
      }

      // Convert em/rem values to device pixel values
      // assuming 16 as the basis for rem and
      // treating em as rem
      if (decl.value.includes('rem') || decl.value.includes('em')) {
        decl.value = decl.value.replace(remRE, (match, offset, value) => {
          const converted = '' + (parseFloat(match) * 16)

          options.debug && console.log('replacing r?em value', {
            match,
            offset,
            value,
            converted
          })

          return converted
        })
        options.debug && console.log({
          final: decl.value
        })
      }

      // remove unsupported properties
      if (!decl.prop.startsWith('--') && !isSupportedProperty(decl.prop, decl.value)) {
        // options.debug && console.log('removing ', decl.prop, decl.value)
        decl.remove()
      }
    },
  }
}
module.exports.postcss = true

const supportedProperties = {
  'color': true,
  'background': true,
  'background-color': true,
  'placeholder-color': true,
  'background-image': true,
  'background-repeat': ['repeat', 'repeat-x', 'repeat-y', 'no-repeat'],
  'background-position': true,
  'background-size': true,
  'border-color': true,
  'border-top-color': true,
  'border-right-color': true,
  'border-bottom-color': true,
  'border-left-color': true,
  'border-width': true,
  'border-top-width': true,
  'border-right-width': true,
  'border-bottom-width': true,
  'border-left-width': true,
  'border-radius': true,
  'border-top-left-radius': true,
  'border-top-right-radius': true,
  'border-bottom-right-radius': true,
  'border-bottom-left-radius': true,
  'font': true,
  'font-family': true,
  'font-size': true,
  'font-style': ['italic', 'normal'],
  'font-weight': true,
  'text-align': ['left', 'center', 'right'],
  'text-decoration': ['none', 'line-through', 'underline'],
  'text-transform': ['none', 'capitalize', 'uppercase', 'lowercase'],
  'transform': true,
  'letter-spacing': true,
  'line-height': true,
  'z-index': true,
  'clip-path': true,
  'vertical-align': ['top', 'center', 'bottom', 'stretch'],
  'horizontal-align': ['left', 'center', 'right', 'stretch'],
  'margin': true,
  'margin-top': true,
  'margin-right': true,
  'margin-bottom': true,
  'margin-left': true,
  'width': true,
  'height': true,
  'min-width': true,
  'min-height': true,
  'padding': true,
  'padding-top': true,
  'padding-right': true,
  'padding-bottom': true,
  'padding-left': true,
  'visibility': ['visible', 'collapse'],
  'opacity': true,
}

const unsupportedPseudoSelectors = [
  ':hover',
  ':focus-within',
]
const unsupportedValues = [
  'min-content',
  'max-content',
  'vw',
  'vh'
]
