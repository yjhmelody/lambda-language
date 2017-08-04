#!/usr/bin/env node

let InputStream = require('./src/InputStream')
let TokenStream = require('./src/TokenStream')
let parser = require('./src/parser')
let Environment = require('./src/Environment')

const fs = require('fs')

let globalEnv = new Environment()

globalEnv.def('println', (val) => {
    console.log(val)
})

for (let k in fs){
    globalEnv.def(k, fs[k])
}

module.exports = globalEnv
