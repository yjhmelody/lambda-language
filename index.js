#!/usr/bin/env node

let InputStream = require('./src/InputStream')
let TokenStream = require('./src/TokenStream')
let parser = require('./src/parser')
let Environment = require('./src/Environment')

const fs = require('fs')
const util = require('util')
const path = require('path')
const os = require('os')

const globalEnv = new Environment()

// define the "print\n" primitive function
globalEnv.def('println', (callack, value) => {
    console.log(value)
    callack(false)
})

module.exports = globalEnv