module.exports = TokenStream

/**
 * 
 * @param {InputStream} input 
 * @returns {Object} can parse token to object; used by parser
 */
function TokenStream(input) {
    //  we need a current variable which keeps track of the current token.    
    let current = null
    let keywords = ' if then else lambda λ true false '

    return {
        next,
        peek,
        eof,
        croak: input.croak
    }

    function isKeyword(x) {
        return keywords.includes(' ' + x + ' ')
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
        // warming: debug
        // console.log('peek', input.peek())
        // console.log('pred', predicate)
        
        while (!input.eof() && predicate(input.peek())) {
            str += input.next()
        }
        // console.log('str', str)
        return str
    }

    /**
     * 
     * We only support decimal numbers with the usual notation 
     * (no 1E5 stuff, no hex, no octal). But if we ever need more, 
     * the changes go only in read_number() and are pretty easy to do
     */
    function readNumber() {
        let hasDot = false
        let number = readWhile(function (ch) {
            // may meet two dots
            if (ch === '.') {
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
     * @returns {String} str
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
            } else if (ch === '\\') {
                escaped = true
                // when meet end char
            } else if (ch === end) {
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
        readWhile(ch => ch !== '\n')
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

        if (ch === '#') {
            skipComment()
            // recursive
            return readNext()
        }
        if (ch === '"') {
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
            // can read a multi-character operator
            return {
                type: 'op',
                value: readWhile(isOpChar)
            }
        }
        input.croak('Cannot handle character: ' + ch)
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