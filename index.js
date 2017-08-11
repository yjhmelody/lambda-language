#!/usr/bin/env node

let InputStream = require('./src/InputStream')
let TokenStream = require('./src/TokenStream')
let parser = require('./src/parser')
let Environment = require('./src/Environment')
let makejs = require('./src/codeGen')

let Execute = Environment.Execute
let evalute = Environment.evalute

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

globalEnv.def('sleep', (k, millisenconds) => {
    setTimeout(() => {
        Execute(k, [false])
    }, millisenconds)
})

globalEnv.def('halt', (k) => {})

globalEnv.def("readFile", function (k, filename) {
    fs.readFile(filename, function (err, data) {
        // error handling is a bit more complex, ignoring for now
        Execute(k, [data]); // hope it's clear why we need the Execute
    })
})

globalEnv.def("writeFile", function (k, filename, data) {
    fs.writeFile(filename, data, function (err) {
        Execute(k, [false]);
    })
})

globalEnv.def("twice", function (k, a, b) {
    // console.log('1!!!!!', a)
    k(a)
    // console.log('2!!!!!', b)
    k(b)
})



module.exports = globalEnv