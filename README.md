# nativescript-tailwind

Like using [Tailwind](https://tailwindcss.com/)? You can use it in NativeScript with a little help from this package! 

```html
<Label text="TailwindCSS is awesome!" 
      class="text-center bg-blue-200 text-blue-600 px-2 py-1 rounded-full" />
```
![TailwindCss is awesome!](https://user-images.githubusercontent.com/879060/81098285-73e3ad80-8f09-11ea-8cfa-7e2ec2eebcde.png)


# Usage

First, install the package into your project

```bash
npm install --save nativescript-tailwind
```

Then you can use it in a couple ways:
 1. [Pre Built CSS](#1-pre-built-css) (Quickest for protyping)
 2. [Build the CSS based on your own config](#2-build-the-css-based-on-your-own-config)
 3. [Use as a PostCSS plugin](#3-use-as-a-postcss-plugin) (**Recommended**)


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

To use tailwind with NativeScript, you need to set up PostCSS, below are 2 guides depending on what css flavor you prefer.

<details>
 <summary>With CSS</summary>
 
 *1. Install dependencies*
 
 ```bash
 $ yarn add -D tailwindcss nativescript-tailwind postcss postcss-loader
 $ # or using npm
 $ npm install --save-dev tailwindcss nativescript-tailwind postcss postcss-loader
 ```
 
 *2. Initialize a `tailwind.config.js` (optional)*
 
 To create a `tailwind.config.js` run
 ```bash
 $ npx tailwindcss init
 ```
 This will create a blank `tailwind.config.js` where you will be able to tweak the default configuration.
 
 *3. Create a `postcss.config.js`*
 
 In the root of your project, create a new file and name it `postcss.config.js` with the following contents
 ```js
 module.exports = {
    plugins: [
        require('tailwindcss'),
        require('nativescript-tailwind')
    ]
 }
 ```
 
 *4. Add tailwind to your `css`*
 
 Replace your `app.css` contents with the following 2 tailwind at-rules to pull in tailwind.
 
 > **Note:** if you already have custom css in your `app.css` you don't have to delete it, the above is only true for fresh projects.
 
 ```scss
 @tailwind components;
 @tailwind utilities;
 ```
 
 *5. Update `webpack.config.js` to use PostCSS*
 
 Find the section of the config that defines the rules/loaders for different file types.
 To quickly find this block - search for `test: /[\/|\\]app\.css$/`.
 
 For every css block, add the `postcss-loader` to the list of loaders, for example:
 ```diff
 {
     test: /[\/|\\]app\.css$/,
     use: [
         'nativescript-dev-webpack/style-hot-loader',
         {
             loader: "nativescript-dev-webpack/css2json-loader",
             options: { useForImports: true }
         },
+       'postcss-loader',
     ],
 }
 ```
 
 *6. Test if everything works!*
 
 Add some tailwind classes to your layout
 ```html
 <Label class="font-bold text-red-500" text="this text should be bold and red!" />
 ```
 And run the app. If the label is bold and red - everything is working, happy tailwinding!
 
</details>

<details>
 <summary>With SCSS</summary>
 
 *1. Install dependencies*
 
 ```bash
 $ yarn add -D tailwindcss nativescript-tailwind postcss postcss-loader
 $ # or using npm
 $ npm install --save-dev tailwindcss nativescript-tailwind postcss postcss-loader
 ```
 
 *2. Initialize a `tailwind.config.js` (optional)*
 
 To create a `tailwind.config.js` run
 ```bash
 $ npx tailwindcss init
 ```
 This will create a blank `tailwind.config.js` where you will be able to tweak the default configuration.
 
 *3. Create a `postcss.config.js`*
 
 In the root of your project, create a new file and name it `postcss.config.js` with the following contents
 ```js
 module.exports = {
    plugins: [
        require('tailwindcss'),
        require('nativescript-tailwind')
    ]
 }
 ```
 
 *4. Add tailwind to your `scss`*
 
 Replace your `app.scss` contents with the following 2 tailwind at-rules to pull in tailwind.
 
 > **Note:** if you already have custom css in your `app.scss` you don't have to delete it, the above is only true for fresh projects.
 
 ```scss
 @tailwind components;
 @tailwind utilities;
 ```
 
 *5. Update `webpack.config.js` to use PostCSS*
 
 Find the section of the config that defines the rules/loaders for different file types.
 To quickly find this block - search for `test: /[\/|\\]app\.css$/`.
 
 For every css block, add the `postcss-loader` to the list of loaders, for example:
 ```diff
 {
     test: /[\/|\\]app\.scss$/,
     use: [
         'nativescript-dev-webpack/style-hot-loader',
         {
             loader: "nativescript-dev-webpack/css2json-loader",
             options: { useForImports: true }
         },
         'sass-loader',
+       'postcss-loader'
     ],
 }
 ```
 
 *6. Test if everything works!*
 
 Add some tailwind classes to your layout
 ```html
 <Label class="font-bold text-red-500" text="this text should be bold and red!" />
 ```
 And run the app. If the label is bold and red - everything is working, happy tailwinding!
 
</details>

**For a runnable example with CSS, see the [Demo App](https://github.com/rigor789/demo-nativescript-vue-tailwind)**

## Purging unused CSS

[Read more about purging on the Tailwind docs](https://tailwindcss.com/docs/controlling-file-size/)

To enable purging when building for production, `NODE_ENV` must be set to `production`

```bash
$ NODE_ENV=production tns build android --production ...
$ # or
$ NODE_ENV=production tns build ios --production ...
```

