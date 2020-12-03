#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const postcss = require('postcss')
const tailwind = require('tailwindcss')

const filename = 'tailwind'
const args = process.argv.slice(2)
const config = args[0] || path.join(__dirname, 'tailwind.js')
const inputFile = path.join(__dirname, `${filename}.css`)
const outputFile = path.join(__dirname, `dist/${filename}.css`)

fs.readFile(inputFile, (err, css) => {
  if (err) throw err

  postcss([
    tailwind(config),
    require('./removeUnsupported')
  ])
    .process(css, {
      from: inputFile,
      to: outputFile,
      map: {inline: false},
    })
    .then(result => {
      fs.writeFileSync(outputFile, result.css)
      if (result.map) {
        fs.writeFileSync(`${outputFile}.map`, result.map.toString())
      }
      return result
    })
    .then(result => {
      console.log('Built.')
    })
})
