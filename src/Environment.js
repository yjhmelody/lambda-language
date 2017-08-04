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
    }
    /**
     * 
     * to create a subscope
     * @returns {Environment} 
     * @memberof Environment
     */
    extend() {
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
 * 
 * @param {Object} expr 
 * @param {Environment} env 
 * @returns {any} expression result
 */
function evaluate(expr, env) {
    if (typeof expr !== 'object') {
        throw new TypeError('the evaluate error!')
    }
    switch (expr.type) {
        case 'num':
        case 'str':
        case 'bool':
            return expr.value

            // Variables are fetched from the environment. Remember 
            // that "var" tokens contain the name in the value property
        case 'var':
            return env.get(expr.value)

            // For assignment, we need to check if the left side is a "var" token
            // Then we use env.set to set the value. Note that the value 
            // needs to be computed first by calling evaluate recursively.
        case 'assign':
            if (expr.left.type !== 'var') {
                throw TypeError('Cannot assign to ' + JSON.stringify(expr.left))
            }
            // recursive
            return env.set(expr.left.value, evaluate(expr.right, env))

        case 'binary':
            return applyOP(expr.operator, evaluate(expr.left, env), evaluate(expr.right, env))

            // A "lambda" node will actually result in a JavaScript closure, 
            // so it will be callable from JavaScript just like an ordinary function. 
        case 'lambda':
            return makeLambda(expr, env)

            // Evaluating an "if" node is simple: first evaluate the condition.
            // If it's not false then evaluate the "then" branch and return its value.
            // Otherwise, evaluate the "else" branch, if present, or return false.
        case 'if':
            let cond = evaluate(expr.cond, env)
            if (cond) {
                return evaluate(expr.then, env)
            } else {
                return expr.else ? evaluate(expr.else, env) : false
            }

            // A "prog" is a sequence of expressions. 
            // We just evaluate them in order and return 
            // the value of the last one. For an empty sequence, 
            // the return value is initialized to false.
        case 'prog':
            let val = false
            expr.prog.forEach((expr) => {
                val = evaluate(expr, env)
            })
            return val

            // For a "call" node we need to call a function. 
            // First we evaluate the func, which should return a normal JS function, 
            // then we evaluate the args and apply that function.
        case 'call':
            let func = evaluate(expr.func, env)
            return func.apply(null, expr.args.map((arg) => {
                return evaluate(arg, env)
            }))

        default:
            throw new SyntaxError('I do not know how to evaluate ' + exp.type)
    }
}

/**
 * 
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
 * 
 * @param {any} x 
 * @returns {any} x
 */
function checkNumber(x) {
    return checkType(x, 'number')
}

/**
 * 
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
    return lambda

    function lambda() {
        let names = expr.vars
        let scope = env.extend()
        for (let i = 0; i < names.length; i++) {
            // some confusions
            scope.def(names[i], i < arguments.length ? arguments[i] : false)
        }
        return evaluate(expr.body, scope)
    }
}

module.exports = Environment
// Primitive functions