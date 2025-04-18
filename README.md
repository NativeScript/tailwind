# @nativescript/tailwind

> **Warning**: :warning: For **Tailwind CSS v3**, `@nativescript/core@8.2.0` is required for colors to work properly. You may see wrong colors on older core versions, because Tailwind CSS v3 uses the RGB/A color notation, which has been implemented for 8.2.0. **Tailwind CSS v4** uses Lightning CSS which handles this automatically.

Makes using [Tailwind CSS](https://tailwindcss.com/) in NativeScript a whole lot easier!

```html
<label
  text="Tailwind CSS is awesome!"
  class="px-2 py-1 text-center text-blue-600 bg-blue-200 rounded-full"
/>
```

![Tailwind CSS is awesome!](https://user-images.githubusercontent.com/879060/81098285-73e3ad80-8f09-11ea-8cfa-7e2ec2eebcde.png)

## Usage

> **Note:** This guide assumes you are using `@nativescript/webpack@5.x` or higher. If you have not upgraded yet, please read the docs below for usage with older `@nativescript/webpack` versions (applicable to Tailwind CSS v3).

### Tailwind CSS v4

If you need to use Tailwind CSS v4, follow these steps. Tailwind CSS v4 [support](https://github.com/NativeScript/tailwind/pull/194) simplifies the setup significantly over v3.

**Install dependencies:**

    ```cli
    npm install --save @nativescript/tailwind tailwindcss
    ```

**Import Tailwind:** Add the following to your `app.css` or `app.scss`:

    ```css
    @import 'tailwindcss';
    ```

#### Upgrading from Tailwind CSS 3

**Update dependencies:**

    ```cli
    npm install --save tailwindcss@latest
    ```

Open your `app.css` or `app.scss` and replace any existing Tailwind imports with:

    ```css
    @import 'tailwindcss';
    ```

### Tailwind CSS v3 

If you need to use Tailwind CSS v3, follow these steps:

**Install dependencies:**

    ```cli
    npm install --save @nativescript/tailwind tailwindcss
    ```

**Generate `tailwind.config.js`:**

    ```cli
    npx tailwindcss init
    ```

**Configure `tailwind.config.js`:** When the [NativeScript CLI](https://github.com/NativeScript/nativescript-cli) creates a new project, it may put code into a `src` folder instead of the `app` referenced below. Adjust `content`, `darkMode`, `corePlugins` plus any other settings you need. Here are the values we recommend. **If you're struggling to get Tailwind working for the first time, check the `content` setting.**

    ```js
    // tailwind.config.js
    const plugin = require('tailwindcss/plugin');

    /** @type {import('tailwindcss').Config} */
    module.exports = {
      // check this setting first for initial setup issues
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

**Include Tailwind directives:** Change your `app.css` or `app.scss` to include the tailwind directives:

    ```css
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    ```

Start using tailwind in your app.

### Using a custom PostCSS config

Manual PostCSS configuration is typically **not required** for **Tailwind CSS v4**. `@nativescript/tailwind` handles the necessary setup automatically.

However, if you need to add *other* PostCSS plugins alongside Tailwind v4, create a `postcss.config.js` (or other supported formats, see https://github.com/webpack-contrib/postcss-loader#config-files) and include `@nativescript/tailwind`:

```js
// postcss.config.js (Example for v4 with other plugins)

module.exports = {
  plugins: [
    "@nativescript/tailwind", // Handles Tailwind v4 setup
    // Add other PostCSS plugins here
    "@csstools/postcss-is-pseudo-class" 
  ],
};
```

For **Tailwind CSS v3**, if you need to customize the postcss configuration (e.g., use a custom `tailwind.config.custom.js`), you can create a `postcss.config.js` file.

```js
// postcss.config.js (Example for v3 customization)

module.exports = {
  plugins: [
    ["tailwindcss", { config: "./tailwind.config.custom.js" }],
    "@nativescript/tailwind",
    // Add other PostCSS plugins here
    "@csstools/postcss-is-pseudo-class" 
  ],
};
```

> **Note (Tailwind CSS v3):** If you want to apply customizations to `tailwindcss` or `@nativescript/tailwind` in v3 using a custom PostCSS config, you will need to disable autoloading:
> 
> ```cli
> ns config set tailwind.autoload false
> ```

## Usage with older @nativescript/webpack versions

This usage is considered legacy and will not be supported - however we are documenting it here in case your project is still using older `@nativescript/webpack`. **This applies to Tailwind CSS v3 setups.**

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
