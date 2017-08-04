/**
 * 
 * The character input stream
 * @param {string} input 
 * @returns inputstream
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

    function peek() {
        return input.charAt(pos)
    }

    function eof() {
        return peek() == ''
    }

    function croak(msg) {
        throw new Error(`${msg} (${line}:${col})`)
    }
}

/**
 * 
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
     * 
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
     * 
     * 
     * @param {String} end 
     * @returns {String}
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
        } else if (ch == '"') {
            // when meet string
            return readString()
        } else if (isDigit(ch)) {
            return readNumber()
        } else if (isIdStart(ch)) {
            return readIdent()
        } else if (isPunc(ch)) {
            return {
                type: 'punc',
                value: input.next()
            }
        } else if (isOpChar(ch)) {
            return {
                type: 'op',
                value: readWhile(isOpChar)
            }
        } else {
            input.croak('cannot handle character: ' + ch)
        }
    }

    function peek() {
        return current || (current = readNext())
    }

    function next() {
        let tok = current
        current = null
        return tok || readNext()
    }

    function eof() {
        return peek() == null
    }

    /**
     * 
     * This function will be invoked when the lambda keyword 
     * has already been seen and “eaten” from the input, 
     * so all it cares for is to parse the argument names;
     * but they're in parentheses and delimited by commas.
     * @returns lambda 
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
     * delimited is a bit lower-level:
     * @param {String} start 
     * @param {String} stop 
     * @param {String} separator 
     * @param {function} parser 
     */
    function delimited(start, stop, separator, parser) {
        let a = []
        first = true
        // skip the punctuation
        skipPunc(start)
        while (!input.eof()) {
            if (ispunc) {
                break
            } else if (first) {
                first = false
            } else {
                skipPunc(separator)
            }
            // the last separator can be missing
            if (isPunc(stop)) {
                break
            }
            a.push(parser())
        }
        skipPunc(stop)
        return a
    }

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

    function parseIf() {
        // this throws an error if the current token is not the given keyword
        skipKeyward('if')
        // parse the condition
        let cond = parseExpression()
        // if the consequent branch doesn't 
        // start with a { we require the keyword then to be present
        if (!isPunc("{")) {
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
     * parseAtom() does the main dispatching job, 
     * depending on the current token:
     * @return 
     */
    function parseAtom() {
        return maybeCall(() => {
            if(isPunc('(')){
                input.next()
                var expression = parseExpression()
                skipPunc(')')
                return expression
            }
            if(isPunc('{')){
                return parseProg()
            }
            else if(isKeyword('if')){
                return parseIf()
            }
            else if(isKeyword('true') || isKeyword('false')){
                return parseBool()
            }
        })
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