module.exports = {
  content: ["./app/**/*.{css,xml,html,vue,svelte,ts,tsx}"],
  // use .dark to toggle dark mode - since 'media' (default) does not work in NativeScript
  darkMode: "class",
  theme: {
    extend: {}
  },
  plugins: [],
  corePlugins: {
    preflight: false // disables browser-specific resets
  }
};
