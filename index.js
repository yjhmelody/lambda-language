#!/usr/bin/env node
const fs = require('fs')

let InputStream = require('./src/InputStream')
let TokenStream = require('./src/TokenStream')
let parser = require('./src/parser')
let Environment = require('./src/Environment')
let makejs = require('./src/codeGen')
let Execute = Environment.Execute
let evalute = Environment.evalute

const globalEnv = new Environment()

/**
 * So our evaluator is now implemented in “continuation passing style”,
 * and all our functions, be them defined in the new language, 
 * or primitives defined in JavaScript, take as first argument a callback to 
 * invoke with the result (although, that argument is explicit for primitives, 
 * but invisible for functions defined in the language).
 */
globalEnv.def('println', (callack, value) => {
    console.log(value)
    callack(false)
})

globalEnv.def('sleep', (k, millisenconds) => {
    setTimeout(() => {
        Execute(k, [false])
    }, millisenconds)
})

/**
 * It's a do-nothing function. 
 * It receives a continuation (k) but it doesn't call it
 */
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

/**
 * It takes two arguments a and b and it invokes 
 * the continuation twice, once for each argument.
 */
globalEnv.def("twice", function (k, a, b) {
    // console.log('1!!!!!', a)
    k(a)
    // console.log('2!!!!!', b)
    k(b)
})

/**
 * It “reifies” the current continuation into a function that 
 * can be called directly from the new language. That function 
 * will ignore its own continuation (discarded) and will invoke 
 * instead the original continuation that CallCC had.
 */
globalEnv.def("CallCC", function (k, f) {
    f(k, function CC(discarded, ret) {
        k(ret);
    });
});


module.exports = globalEnv