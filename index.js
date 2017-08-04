/**
 * 
 * The character input stream
 * @param {string} input 
 * @returns {Object} inputstream, can do something on one symbol
 */
function InputStream(input) {
    let pos = 0
    let line = 1
    let col = 0

    return {
        next,
        peek,
        eof,
        croak
    }
    /**
     * 
     * read next symbol 
     * @returns 
     */
    function next() {
        var ch = input.charAt(pos++)
        if (ch == '\n') {
            line++
            col = 0
        } else {
            col++
        }
        return ch
    }
    /**
     * 
     * peek the symbol
     * @returns {String}  
     */
    function peek() {
        return input.charAt(pos)
    }
    /**
     * 
     * check if it is eof
     * @returns {Boolean}
     */
    function eof() {
        return peek() === ''
    }
    /**
     * 
     * throw a error
     * @param {any} msg 
     */
    function croak(msg) {
        throw new Error(`${msg} (${line}:${col})`)
    }
}


/**
 * 
 * @param {InputStream} input 
 * @returns {Object}
 */
function TokenStream(input) {
    //  we need a current variable which keeps track of the current token.    
    let current = null
    let keywords = ' if then else lambda λ true false '

    return {
        next,
        peek,
        eof,
        croak
    }

    function isKeyword(ch) {
        return keywords.includes(` ${ch} `)
    }

    function isDigit(ch) {
        return /[0-9]/i.test(ch)
    }

    function isIdStart(ch) {
        return /[a-zλ_]/i.test(ch)
    }

    function isId(ch) {
        return isIdStart(ch) || "?!-<>=0123456789".includes(ch)
    }

    function isOpChar(ch) {
        return '+-*/%=&|<>!'.includes(ch)
    }

    function isPunc(ch) {
        return ',;(){}[]'.includes(ch)
    }

    function isWhitespace(ch) {
        return ' \t\n'.includes(ch)
    }

    /**
     * 
     * readWhile is used to check many structs
     * @param {function} predicate 
     * @returns {String}
     */
    function readWhile(predicate) {
        let str = ''
        //when not arriving at eof && next char satisfy the condition of predicate    
        while (!input.eof() && predicate(input.peek())) {
            str += input.next()
            return str
        }
    }

    /**
     * 
     * We only support decimal numbers with the usual notation 
     * (no 1E5 stuff, no hex, no octal). But if we ever need more, 
     * the changes go only in read_number() and are pretty easy to do
     */
    function readNumber() {
        let hasDot = false
        let numbers = readWhile(function (ch) {
            if (ch == '.') {
                if (hasDot) {
                    return false
                }
                hasDot = true
                return true
            }
            return isDigit(ch)
        })

        return {
            type: 'num',
            value: parseFloat(number)
        }
    }

    function readIdent() {
        let id = readWhile(isId)
        return {
            type: isKeyword(id) ? 'kw' : 'var',
            value: id
        }
    }

    /**
     * 
     * to escape some special symbols
     * @param {String} end 
     * @returns {String} mystring
     */
    function readEscaped(end) {
        let escaped = false
        let str = ''
        input.next()
        while (!input.eof()) {
            let ch = input.next()
            // attention to escaped char
            if (escaped) {
                str += ch
                escaped = false
            } else if (ch == '\\') {
                escaped = true
                // when meet end char
            } else if (ch == end) {
                break
            } else {
                str += ch
            }
        }
        return str
    }

    function readString() {
        return {
            type: 'str',
            value: readEscaped('"')
        }
    }

    function skipComment() {
        readWhile(ch => ch != '\n')
        input.next()
    }

    /**
     * 
     * read and check the next token 
     * @returns {Object} ast 
     */
    function readNext() {
        readWhile(isWhitespace)
        if (input.eof()) {
            return null
        }
        let ch = input.peek()

        if (ch == '#') {
            skipComment()
            // recursive
            return readNext()
        }
        if (ch == '"') {
            // when meet string
            return readString()
        }
        if (isDigit(ch)) {
            return readNumber()
        }
        if (isIdStart(ch)) {
            return readIdent()
        }
        if (isPunc(ch)) {
            return {
                type: 'punc',
                value: input.next()
            }
        }
        if (isOpChar(ch)) {
            return {
                type: 'op',
                value: readWhile(isOpChar)
            }
        }
        input.croak('cannot handle character: ' + ch)
    }

    /**
     * 
     * @returns {Object} token 
     */
    function peek() {
        return current || (current = readNext())
    }

    /**
     * 
     * @returns {Object} token
     */
    function next() {
        let token = current
        current = null
        return token || readNext()
    }

    /**
     * check eof 
     * @returns {Boolean}
     */
    function eof() {
        return peek() == null
    }

}


// we're going to use the FALSE node in various places,
// so I'm making it a global.
let FALSE = {
    type: "bool",
    value: false
}

let TRUR = {
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
    "+": 10,
    "-": 10,
    "*": 20,
    "/": 20,
    "%": 20,
}

/**
 * 
 * @param {TokenStream} input 
 * @returns {Object} ast
 */
function parse(input) {
    return parseToplevel()

    function isPunc(str) {
        let token = input.peek()
        return token && token.type === 'punc' && (!str || token.value === str)
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
     * @return {Array} a, store a series of tokens which returns by parser
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

        return maybeCall(() => {
            if (isPunc('(')) {
                input.next()
                var expression = parseExpression()
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
            if (isKeyword('lambda') || isKeyword('λ')) {
                input.next()
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
        return maybeCall(() => maybeBinary(parseAtom(), 0))
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
        return {
            type: 'lambda',
            vars: delimited('(', ')', ',', parseVarname),
            body: parseExpression()
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
     * @returns {Object} 
     */
    function parseProg() {
        let prog = delimited('{', '}', ';')
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