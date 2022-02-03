# @nativescript/tailwind

Makes using [Tailwind CSS](https://tailwindcss.com/) in NativeScript a whole lot easier!

```html
<label
  text="Tailwind CSS is awesome!"
  class="px-2 py-1 text-center text-blue-600 bg-blue-200 rounded-full"
/>
```

![Tailwind CSS is awesome!](https://user-images.githubusercontent.com/879060/81098285-73e3ad80-8f09-11ea-8cfa-7e2ec2eebcde.png)

# Usage (with @nativescript/webpack version 5.x)

Install `@nativescript/tailwind` and `tailwindcss`

```bash
npm install --save @nativescript/tailwind tailwindcss
```

Change your `app.css` or `app.scss` to include the tailwind utilities

```css
@tailwind components;
@tailwind utilities;
```

Start using tailwind.

# Using Tailwind CSS JIT (just in time)

Tailwind's new jit mode is supported, it just has to be enabled in the config. See https://tailwindcss.com/docs/just-in-time-mode#enabling-jit-mode for details.

To generate a blank config, you can run

```bash
npx tailwindcss init
```

Example config with `jit` enabled:

```js
// tailwind.config.js

module.exports = {
  mode: 'jit',
  purge: [
    './app/**/*.{css,xml,html,vue,svelte,ts,tsx}'
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
```

# Using a PostCSS config

In case you need to customize the postcss configuration, you can create a `postcss.config.js` (other formats are supported, see https://github.com/webpack-contrib/postcss-loader#config-files) file and add any customizations, for example:

```js
// postcss.config.js

module.exports = {
  plugins: [
    ["tailwindcss", { config: "./tailwind.config.custom.js" }],
    "@nativescript/tailwind",
  ],
};
```

> **Note:** if you want to apply customizations to `tailwindcss` or `@nativescript/tailwind`, you will need to disable autoloading:
> 
> ```bash
> ns config set tailwind.autoload false
> ```
> This is required only if you make changes to either of the 2 plugins - because by default `postcss-loader` processes the config file first, and then the `postcssOptions` passed to it. With autoloading enabled, any customizations will be overwritten due to the loading order. Setting `tailwind.autoload` to `false` just disables the internal loading of these plugins, and requires you to manually add them to your postcss config in the above order.


## Usage (with @nativescript/webpack version <5.x)

This usage is considered legacy and will not be supported - however we are documenting it here in case your project is still using older `@nativescript/webpack`.

<details>

  <summary>See instructions</summary>

```bash
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

Change your `app.css` or `app.scss` to include the tailwind utilities

```css
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

## Usage with the pre-built css

`@nativescript/tailwind` ships with a pre-built `dist/tailwind.css` file that's built using the default tailwind config.

Using the pre-built css is not recommended, since you lose the ability to configure tailwind, jit, purging etc.

<details>
  
  <summary>See instructions</summary>

  Import the pre-built css file in your `app.css` (or `scss`):
  
  ```css
  @import "@nativescript/tailwind/dist/tailwind.css"
  ```

  Alternatively, import it in your `main.js` (or `main.ts`, `app.js`, `app.ts` etc.)

  ```js
  import '@nativescript/tailwind/dist/tailwind.css'
  ```

  In `.vue` files you can also do

  ```html
  <style src="@nativescript/tailwind/dist/tailwind.css" />
  ```
  
  > **Note:** make sure you only include this once (for example in `App.vue`) - otherwise your bundle will contain the whole tailwind.css file multiple times.


</details>
