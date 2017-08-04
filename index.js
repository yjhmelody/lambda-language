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
globalEnv.def('println', (val) => {
    console.log(val)
})

register(globalEnv, console, 'console-')
register(globalEnv, fs, 'fs-')
register(globalEnv, util, 'util-')
register(globalEnv, path, 'path-')
register(globalEnv, os, 'os-')


function register(env, obj, prefix = '') {
    for (let k in obj) {
        env.def(prefix + k, obj[k])
    }
}

module.exports = globalEnv