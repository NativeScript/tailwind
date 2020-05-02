# nativescript-tailwind

Like using [Tailwind](https://tailwindcss.com/)? You can use it in NativeScript with a little help from this package! 

# Usage

First, install the package into your project

```bash
npm install --save nativescript-tailwind
```

Then you can use it in a couple ways:
 1. [Pre Built CSS](#1-pre-built-css) (Quickest for protyping)
 2. [Build the CSS based on your own config](#2-build-the-css-based-on-your-own-config)
 3. [Use as a PostCSS plugin](#3-use-as-a-postcss-plugin) (Recommended)


## 1. Pre Built CSS

Import the built css based on the default tailwindcss config from `nativescript-tailwind/dist/tailwind.css`

This is the easiest and quickest way to try out Tailwind in NativeScript, but you are limited to the default config.

There are a couple ways to do this, for example in a Vue component you can add

```html
<style src="nativescript-tailwind/dist/tailwind.css" />
```

Or import it in a css file

```css
@import "nativescript-tailwind/dist/tailwind.css"
```

Or import it in your `main.js`

```js
import 'nativescript-tailwind/dist/tailwind.css'
```

## 2. Build the CSS based on your own config

This package ships with an executable script which can build your css file using your own tailwind config.

```bash
node node_modules/.bin/nativescript-tailwind tailwind.config.js
# or
npx nativescript-tailwind tailwind.config.js
```

## 3. Use as a PostCSS plugin

If you're using PostCSS, you can [install tailwind according to their official docs](https://tailwindcss.com/docs/installation/), and then include the `nativescript-tailwind` postcss plugin.

```js
// postcss.config.js

module.exports = {
  plugins: [
    // ...
    require('tailwindcss'),
    require('nativescript-tailwind'),
    // ...
  ]
}
```

For an example, see [Demo](https://github.com/rigor789/demo-nativescript-vue-tailwind)

The changes compared to a fresh app:
 * Installed deps: `npm i postcss postcss-loader tailwindcss nativescript-tailwind --save-dev`
 * Added  `tailwind.config.js` with `npx tailwindcss init` + added the purge option manually
 * Added `postcss.config.js`
 * Edited `app.css` to include tailwind components and utilities. (base is not used in NativeScript, so it's left out from the css)
 * Added 'postcss-loader' to all css rules in `webpack.config.js`
 
To enable purge when building for production, `NODE_ENV` must be set to `production`, for example

```bash
$ NODE_ENV=production tns build android --production --...
```
