module.exports = parser

// we're going to use the FALSE node in various places,
// so I'm making it a global.
let FALSE = {
    type: "bool",
    value: false
}

let TRUE = {
    type: 'bool',
    value: true
}

/**
 * 
 * maybeBinary(left, my_prec) is used to compose 
 * binary expressions like 1 + 2 * 3. The trick to 
 * parse them properly is to correctly define 
 * the operator precedence, so we'll start with that:
 */
let PRECEDENCE = {
    "=": 1,
    "||": 2,
    "&&": 3,
    "<": 7,
    ">": 7,
    "<=": 7,
    ">=": 7,
    "==": 7,
    "!=": 7,
    "<<": 8,
    ">>": 8,
    "+": 10,
    "-": 10,
    "*": 20,
    "/": 20,
    "%": 20,
}

/**
 * 
 * @param {TokenStream} input, operate tokens 
 * @returns {Object} ast
 */
function parser(input) {
    return parseToplevel()

    function isPunc(str) {
        let token = input.peek()
        return token && token.type === 'punc' && (!str || token.value === str) && token
    }

    function isKeyword(kw) {
        let token = input.peek()
        return token && token.type === 'kw' && (!kw || token.value === kw) && token
    }

    function isOp(op) {
        let token = input.peek()
        return token && token.type === 'op' && (!op || token.value === op) && token
    }

    function skipPunc(str) {
        // !bug: cannot Identity `;`
        if (isPunc(str)) {
            input.next()
        } else {
            input.croak(`Expecting punctuation: "${str}"`)
        }
    }

    function skipKeyward(kw) {
        if (isKeyword(kw)) {
            input.next()
        } else {
            input.croak(`Expecting keyword: "${kw}"`)
        }
    }

    function skipOp(op) {
        if (isOp(op)) {
            input.next()
        } else {
            input.croak(`Expecting operator: "${op}"`)
        }
    }

    function unexpected() {
        input.croak(`Unexpected token: ${JSON.stringify(input.peek())}`)
    }

    /**
     * 
     * delimited is a bit lower-level:
     * @param {String} start 
     * @param {String} stop 
     * @param {String} separator 
     * @param {function} parser 
     * @return {Array} arr, store a series of tokens which returns by parser
     */
    function delimited(start, stop, separator, parser) {
        let arr = []
        first = true
        // skip the punctuation
        skipPunc(start)
        while (!input.eof()) {
            if (isPunc(stop)) {
                break
            }
            if (first) {
                first = false
            } else {
                skipPunc(separator)
            }
            // the last separator can be missing
            if (isPunc(stop)) {
                break
            }
            arr.push(parser())
        }
        skipPunc(stop)
        return arr
    }

    /**
     * 
     * These `maybe*` functions check what follows after 
     * an expression in order to decide whether to wrap 
     * that expression in another node, or just return it as is.
     * @param {function} expression 
     * @returns {Object} ast
     */
    function maybeCall(expression) {
        expr = expression()
        return isPunc('(') ? parseCall(expr) : expr
    }

    /**
     * 
     * If it's an operator that has a higher precedence than ours, 
     * then it wraps left in a new "binary" node, and for the right 
     * side it repeats the trick at the new precedence level (*):
     * 
     * since myPrecedence is initially zero, any operator will trigger
     * the building of a "binary" node (or "assign" when the operator is =)
     * @param {Object} left 
     * @param {Number} myPrecedence
     * @return {Object} op ast
     */
    function maybeBinary(left, myPrecedence) {
        let token = isOp()
        if (token) {
            let hisPrecedence = PRECEDENCE[token.value]
            // need to read more token
            if (hisPrecedence > myPrecedence) {
                input.next()
                // check whether the right operand is a binary operation
                // firstly do the operation which is higher precedence
                // after finishing recursive, it returns the right operand
                let right = maybeBinary(parseAtom(), hisPrecedence) // (*)
                let binary = {
                    type: token.value === '=' ? 'assign' : 'binary',
                    operator: token.value,
                    left: left,
                    right: right
                }
                return maybeBinary(binary, myPrecedence)
            }
        }
        return left
    }

    /**
     * 
     * parseAtom() does the main dispatching job, 
     * depending on the current token:
     * @return {Object} ast
     */
    function parseAtom() {

        return maybeCall(function () {
            if (isPunc('(')) {
                input.next()
                let expression = parseExpression()
                skipPunc(')')
                return expression
            }
            if (isPunc('{')) {
                return parseProg()
            }
            if (isKeyword('if')) {
                return parseIf()
            }
            if (isKeyword('true') || isKeyword('false')) {
                return parseBool()
            }
            if (isKeyword('let')) {
                return parseLet()
            }

            if (isKeyword('lambda') || isKeyword('λ')) {
                return parseLambda()
            }

            let token = input.next()
            if (token.type === 'var' || token.type === 'num' || token.type === 'str') {
                return token
            }
            unexpected()
        })
    }

    /**
     * 
     * @returns {Object} bool ast 
     */
    function parseBool() {
        return {
            type: 'bool',
            value: input.next().value === 'true'
        }
    }

    /**
     * 
     * Contrary to parseAtom(), this one will extend
     *  an expression as much as possible to the right
     *  using maybeBinary(), which is explained below.
     * @return {Object} ast
     */
    function parseExpression() {
        return maybeCall(function () {
            return maybeBinary(parseAtom(), 0)
        })
    }

    /**
     * 
     * @returns {any} basic type's value
     */
    function parseVarname() {
        let name = input.next()
        if (name.type !== 'var') {
            input.croak('Expecting variable name')
        }
        return name.value
    }

    /**
     * 
     * This function will be invoked when the lambda keyword 
     * has already been seen and “eaten” from the input, 
     * so all it cares for is to parse the argument names;
     * but they're in parentheses and delimited by commas.
     * @returns {Object} lambda ast 
     */
    function parseLambda() {
        input.next()
        return {
            type: 'lambda',
            // optional lambda name
            name: input.peek().type === 'var' ? input.next() : null,
            vars: delimited('(', ')', ',', parseVarname),
            body: parseExpression()
        }
    }

    /**
     * 
     * IIFE, optional name
     *  The function's argument names are the variables 
     * defined in let, and the "call" will take care to 
     * send the values in args. And the body of the function is, 
     * of course, fetched with parse_expression()
     * @returns {Object} let ast
     */
    function parseLet() {
        skipKeyward('let')
        if (input.peek().type === 'var') {
            let name = input.next().value
            let defs = delimited('(', ')', ',', parseVardef)
            return {
                type: 'call',
                func: {
                    type: 'lambda',
                    name: name,
                    vars: defs.map(function (def) {
                        return def.name
                    }),
                    body: parseExpression()
                },
                args: defs.map(function (def) {
                    return def.def || FALSE
                })
            }
        }
        return {
            type: 'let',
            vars: delimited('(', ')', ',', parseVardef),
            body: parseExpression()
        }
    }

    function parseVardef() {
        let name = parseVarname()
        let def = null
        if (isOp('=')) {
            // skip the '='
            input.next()
            def = parseExpression()
        }
        return {
            name,
            def
        }
    }

    /**
     * 
     * it will be called firstly
     * @returns {Object} prog ast
     */
    function parseToplevel() {
        let prog = []
        while (!input.eof()) {
            prog.push(parseExpression())
            if (!input.eof()) {
                skipPunc(';')
            }
        }
        return {
            type: 'prog',
            prog: prog
        }
    }

    /**
     * 
     * @returns {Object} if ast
     */
    function parseIf() {
        // this throws an error if the current token is not the given keyword
        skipKeyward('if')
        // parse the condition
        let cond = parseExpression()
        // if the consequent branch doesn't 
        // start with a { we require the keyword then to be present
        if (!isPunc('{')) {
            skipKeyward('then')
        }
        let then = parseExpression()
        let ret = {
            type: 'if',
            cond: cond,
            then: then
        }
        // when there is a 'else'
        if (isKeyword('else')) {
            input.next()
            ret.else = parseExpression()
        }
        return ret
    }

    /**
     * 
     * It will do some minor optimization at this point — 
     * if the prog is empty, then it just returns FALSE. 
     * If it has a single expression, it is returned 
     * instead of a "prog" node. Otherwise it returns
     * a "prog" node containing the expressions.
     * @returns {Object} prog ast
     */
    function parseProg() {
        let prog = delimited('{', '}', ';', parseExpression)
        if (prog.length === 0) {
            return FALSE
        }
        if (prog.length === 1) {
            return prog[0]
        }
        return {
            type: 'prog',
            prog: prog
        }
    }

    /**
     * 
     * @param {any} func 
     * @returns {Object} call ast 
     */
    function parseCall(func) {
        return {
            type: 'call',
            func: func,
            args: delimited('(', ')', ',', parseExpression)
        }
    }
}