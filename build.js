const fs = require('fs')
const postcss = require('postcss')
const tailwind = require('tailwindcss')

const filename = 'tailwind'

fs.readFile(`./${filename}.css`, (err, css) => {
  if (err) throw err

  postcss([tailwind('./tailwind.js'), require('./removeUnsupported')])
    .process(css, {
      from: `./${filename}.css`,
      to: `./dist/${filename}.css`,
      map: {inline: false},
    })
    .then(result => {
      fs.writeFileSync(`./dist/${filename}.css`, result.css)
      if (result.map) {
        fs.writeFileSync(`./dist/${filename}.css.map`, result.map)
      }
      return result
    })
    .then(result => {
      console.log('Built.')
    })
})