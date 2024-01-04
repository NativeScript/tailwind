# @nativescript/tailwind

> **Warning**: :warning: `@nativescript/core@8.2.0` is required for colors to work properly You may see wrong colors on older core versions, because Tailwind CSS v3 uses the RGB/A color notation, which has been implemented for 8.2.0 and prior versions don't support it.

Makes using [Tailwind CSS](https://tailwindcss.com/) in NativeScript a whole lot easier!

```html
<label
  text="Tailwind CSS is awesome!"
  class="px-2 py-1 text-center text-blue-600 bg-blue-200 rounded-full"
/>
```

![Tailwind CSS is awesome!](https://user-images.githubusercontent.com/879060/81098285-73e3ad80-8f09-11ea-8cfa-7e2ec2eebcde.png)

## Usage

> **Note:** This guide assumes you are using `@nativescript/webpack@5.x` as some configuration is done automatically. If you have not upgraded yet, please read the docs below for usage with older `@nativescript/webpack` versions.

Install `@nativescript/tailwind` and `tailwindcss`

```cli
npm install --save @nativescript/tailwind tailwindcss
```

Generate a `tailwind.config.js` with

```cli
npx tailwindcss init
```

Adjust `content`, `darkMode`, `corePlugins` plus any other settings you need, here are the values we recommend: 

```js
// tailwind.config.js
const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{css,xml,html,vue,svelte,ts,tsx}'
  ],
  // use the .ns-dark class to control dark mode (applied by NativeScript) - since 'media' (default) is not supported.
  darkMode: ['class', '.ns-dark'],
  theme: {
    extend: {},
  },
  plugins: [
    /**
     * A simple inline plugin that adds the ios: and android: variants
     * 
     * Example usage: 
     *
     *   <Label class="android:text-red-500 ios:text-blue-500" />
     *
     */
    plugin(function ({ addVariant }) {
      addVariant('android', '.ns-android &');
      addVariant('ios', '.ns-ios &');
    }),
  ],
  corePlugins: {
    preflight: false // disables browser-specific resets
  }
}
```

Change your `app.css` or `app.scss` to include the tailwind utilities

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Start using tailwind in your app.

### Using a custom PostCSS config

In case you need to customize the postcss configuration, you can create a `postcss.config.js` (other formats are supported, see https://github.com/webpack-contrib/postcss-loader#config-files) file and add any customizations, for example:

```js
// postcss.config.js

module.exports = {
  plugins: [
    ["tailwindcss", { config: "./tailwind.config.custom.js" }],
    "@nativescript/tailwind",
    "@csstools/postcss-is-pseudo-class"
  ],
};
```

> **Note:** if you want to apply customizations to `tailwindcss` or `@nativescript/tailwind`, you will need to disable autoloading:
> 
> ```cli
> ns config set tailwind.autoload false
> ```
> This is required only if you make changes to either of the 2 plugins - because by default `postcss-loader` processes the config file first, and then the `postcssOptions` passed to it. With autoloading enabled, any customizations will be overwritten due to the loading order. Setting `tailwind.autoload` to `false` just disables the internal loading of these plugins, and requires you to manually add them to your postcss config in the above order.

## Usage with older @nativescript/webpack versions

This usage is considered legacy and will not be supported - however we are documenting it here in case your project is still using older `@nativescript/webpack`.

<details>

  <summary>See instructions</summary>

  ```cli
  npm install --save-dev @nativescript/tailwind tailwindcss postcss postcss-loader
  ```

  Create `postcss.config.js` with the following:

  ```js
  module.exports = {
    plugins: [
        require('tailwindcss'),
        require('nativescript-tailwind')
    ]
  }
  ```


  Generate a `tailwind.config.js` with

  ```cli
  npx tailwindcss init
  ```

  Adjust `content`, `darkMode`, `corePlugins` plus any other settings you need, here are the values we recommend: 
  
  ```js
  // tailwind.config.js

  module.exports = {
    content: [
      './app/**/*.{css,xml,html,vue,svelte,ts,tsx}'
    ],
    // use .dark to toggle dark mode - since 'media' (default) does not work in NativeScript
    darkMode: 'class',
    theme: {
      extend: {},
    },
    plugins: [],
    corePlugins: {
      preflight: false // disables browser-specific resets
    }
  }
  ```

  Change your `app.css` or `app.scss` to include the tailwind utilities

  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```

  Update `webpack.config.js` to use PostCSS
  
  Find the section of the config that defines the rules/loaders for different file types.
  To quickly find this block - search for `rules: [`.

  For every css/scss block, append the `postcss-loader` to the list of loaders, for example:

  ```diff
  {
    test: /[\/|\\]app\.css$/,
    use: [
      'nativescript-dev-webpack/style-hot-loader',
      {
        loader: "nativescript-dev-webpack/css2json-loader",
        options: { useForImports: true }
      },
  +   'postcss-loader',
    ],
  }
  ```
  
  **Make sure you append `postcss-loader` to all css/scss rules in the config.**

</details>
