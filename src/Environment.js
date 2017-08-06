let InputStream = require('./InputStream')
let TokenStream = require('./TokenStream')
let parser = require('./parser')

/**
 * The key to correct execution is to properly 
 * maintain the environment — a structure holding 
 * variable bindings. It will be passed as an argument 
 * to our evaluate function. Each time we enter a "lambda" 
 * node we must extend the environment with new variables 
 * (function's arguments) and initialize them with values 
 * passed at run time. If an argument shadows a variable from 
 * the outer scope (I'll use words scope and environment 
 * interchangeably here) we must be careful to restore 
 * the previous value when we leave the function.
 */

class Environment {
    /**
     * Creates an instance of Environment.
     * @param {Object | Environment} parent 
     * @memberof Environment
     */
    constructor(parent) {
        this.vars = Object.create(parent ? parent.vars : null)
        this.parent = parent
        this.count = 0
    }
    /**
     * 
     * to create a subscope
     * @returns {Environment} 
     * @memberof Environment
     */
    extend() {
        // this.count++
        // console.log(this.vars)
        return new Environment(this)
    }
    /**
     * 
     * to find the scope where the variable
     * with the given name is defined
     * @param {String} name 
     * @returns {Environment} scope 
     * @memberof Environment
     */
    lookup(name) {
        // environment
        let scope = this
        while (scope) {
            if (Object.prototype.hasOwnProperty.call(scope.vars, name)) {
                return scope
            }
            scope = scope.parent
        }
    }
    /**
     * 
     * to get the current value of a variable
     * @param {String} name 
     * @returns {any} value
     * @memberof Environment
     */
    get(name) {
        if (name in this.vars) {
            return this.vars[name]
        }
        throw new ReferenceError('Undefined variable ' + name)
    }
    /**
     * 
     * to set the value of a variable. This needs to lookup 
     * the actual scope where the variable is defined.
     * @param {String} name 
     * @param {any} value 
     * @returns {any} value 
     * @memberof Environment
     */
    set(name, value) {
        let scope = this.lookup(name)
        // let's not allow defining globals from a nested environment
        if (!scope && this.parent) {
            throw new ReferenceError('Undefined variable ' + name)
        }
        return (scope || this).vars[name] = value
    }
    /**
     * 
     * this creates (or shadows, or overwrites) a variable in the current scope
     * @param {String} name 
     * @param {any} value 
     * @returns {any} value
     * @memberof Environment
     */
    def(name, value) {
        // current scope variable
        return this.vars[name] = value
    }
}

Environment.evaluate = evaluate
Environment.prototype.evaluate = evaluate


// num { type: "num", value: NUMBER }
// str { type: "str", value: STRING }
// bool { type: "bool", value: true or false }
// var { type: "var", value: NAME }
// lambda { type: "lambda", vars: [ NAME... ], body: AST }
// call { type: "call", func: AST, args: [ AST... ] }
// if { type: "if", cond: AST, then: AST, else: AST }
// assign { type: "assign", operator: "=", left: AST, right: AST }
// binary { type: "binary", operator: OPERATOR, left: AST, right: AST }
// prog { type: "prog", prog: [ AST... ] }
// let { type: "let", vars: [ VARS... ], body: AST }

/**
 * 
 * @param {Object} expr 
 * @param {Environment} env 
 * @param {function} callback
 * @returns {any} expression result
 */
function evaluate(expr, env, callback) {
    if (typeof expr !== 'object') {
        throw new TypeError('the evaluate error!')
    }
    switch (expr.type) {
        case 'num':
        case 'str':
        case 'bool':
            return callback(expr.value)

            // Variables are fetched from the environment. Remember 
            // that "var" tokens contain the name in the value property
        case 'var':
            return callback(env.get(expr.value))

            // For assignment, we need to check if the left side is a "var" token
            // Then we use env.set to set the value. Note that the value 
            // needs to be computed first by calling evaluate recursively.
        case 'assign':
            if (expr.left.type !== 'var') {
                throw TypeError('Cannot assign to ' + JSON.stringify(expr.left))
            }
            // recursive
            evaluate(expr.right, env, (right) => {
                callback(env.set(expr.left.value, right))
            })
            return

        case 'binary':
            evaluate(expr.left, env, (left) => {
                evaluate(expr.right, env, (right) => {
                    callback(applyOP(expr.operator, left, right))
                })
            })
            return

            // A "lambda" node will actually result in a JavaScript closure, 
            // so it will be callable from JavaScript just like an ordinary function. 
        case 'lambda':
            callback(makeLambda(expr, env))
            return

        case 'let':
            (function loop(env, i) {
                if (i < expr.vars.length) {
                    let v = expr.vars[i]
                    if (v.def) {
                        evaluate(v.def, env, (value) => {
                            let scope = env.extend()
                            scope.def(v.name, value)
                            loop(scope, i + 1)
                        })
                    }
                } else {
                    evaluate(expr.body, env, callback)
                }
            })(env, 0)
            return
            // Evaluating an "if" node is simple: first evaluate the condition.
            // If it's not false then evaluate the "then" branch and return its value.
            // Otherwise, evaluate the "else" branch, if present, or return false.
        case 'if':
            evaluate(expr.cond, env, (cond) => {
                if (cond !== false) {
                    evaluate(expr.then, env, callback)
                } else if (expr.else) {
                    evaluate(expr.else, env, callback)
                } else {
                    callback(false)
                }
            })
            return

            // A "prog" is a sequence of expressions. 
            // We just evaluate them in order and return 
            // the value of the last one. For an empty sequence, 
            // the return value is initialized to false.
        case 'prog':
            (function loop(last, i) {
                if (i < expr.prog.length) {
                    evaluate(expr.prog[i], env, (value) => {
                        loop(value, i + 1)
                    })
                } else {
                    callback(last)
                }

            })(false, 0)
            return
            // For a "call" node we need to call a function. 
            // First we evaluate the func, which should return a normal JS function, 
            // then we evaluate the args and apply that function.
        case 'call':
            evaluate(expr.func, env, (func) => {
                (function loop(args, i) {
                    if (i < expr.args.length) {
                        evaluate(expr.args[i], env, (arg) => {
                            args[i + 1] = arg
                            loop(args, i + 1)
                        })
                    } else {
                        func.apply(null, args)
                    }
                })([callback], 0)
            })
            return

        default:
            throw new SyntaxError('I do not know how to evaluate ' + exp.type)
    }
}

// check* functions are used to check the value type 

/**
 * 
 * @param {any} x 
 * @param {String} type 
 * @returns {any} x
 */
function checkType(x, type) {
    if (typeof x !== type) {
        throw new TypeError(`Expected ${type} but got ${x}`)
    }
    return x
}

/**
 * 
 * @param {any} x 
 * @returns {any} x
 */
function checkNumber(x) {
    return checkType(x, 'number')
}

/**
 * 
 * @param {any} x 
 * @returns {any} x 
 */
function checkDiv(x) {
    if (checkNumber(x) == 0) {
        throw new Error('Divide by zero')
    }
    return x
}

/**
 * 
 * @param {String} op 
 * @param {any} a 
 * @param {any} b
 * @returns {any} operation result
 */
function applyOP(op, a, b) {
    switch (op) {
        case '+':
            return checkNumber(a) + checkNumber(b)
        case '-':
            return checkNumber(a) - checkNumber(b)
        case '*':
            return checkNumber(a) * checkNumber(b)
        case '/':
            return checkNumber(a) / checkDiv(b)
        case '%':
            return checkNumber(a) % checkDiv(b)
        case '&&':
            return a !== false && b
        case '||':
            return a !== false ? a : b
        case '<':
            return checkNumber(a) < checkNumber(b)
        case '>':
            return checkNumber(a) > checkNumber(b)
        case '<=':
            return checkNumber(a) <= checkNumber(b)
        case '>=':
            return checkNumber(a) >= checkNumber(b)
        case '<<':
            return checkNumber(a) << checkNumber(b)
        case '>>':
            return checkNumber(a) >> checkNumber(b)
        case '==':
            return a === b
        case '!=':
            return a !== b
        default:
            throw new SyntaxError('cannot apply operator ' + op)
    }
}

/**
 * As you can see, it returns a plain JavaScript function that 
 * encloses over the environment and the expression to evaluate. 
 * It's important to understand that nothing happens when this closure 
 * is created — but when it's called, it will extend the environment 
 * that it saved at creation time with the new bindings of arguments/values 
 * (if less values are passed than the function's argument list, 
 * the missing ones will get the value false). And then 
 * it just evaluates the body in the new scope.
 * @param {any} expr 
 * @param {any} env 
 * @return {function} lambda
 */
function makeLambda(expr, env) {
    // If the function name is present, then we extend 
    // the scope right when the closure is created and define the name 
    // to point to the newly created closure. The rest remains unchanged.
    if (expr.name) {
        env = env.extend()
        env.def(expr.name, lambda)
    }

    function lambda(callback) {
        let names = expr.vars
        let scope = env.extend()
        for (let i = 0; i < names.length; i++) {
            // some confusions
            scope.def(names[i], i+1 < arguments.length ? arguments[i+1] : false)
        }
        evaluate(expr.body, scope, callback)
    }
    return lambda
}

module.exports = Environment
// Primitive functions