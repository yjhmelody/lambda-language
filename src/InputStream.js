module.exports = InputStream

/**
 * 
 * The character input stream, can do something on one char
 * @param {String} input code string
 * @returns {Object} inputstream used by TokenStream
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
     * read next char 
     * @returns {String} next char
     */
    function next() {
        let ch = input.charAt(pos++)
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
     * peek the char
     * @returns {String}  
     */
    function peek() {
        return input.charAt(pos)
    }
    /**
     * 
     * check if it is eof
     * @returns {Boolean} isEof
     */
    function eof() {
        return peek() == ''
    }
    /**
     * 
     * throw a error
     * @param {any} msg error infomation
     */
    function croak(msg) {
        throw new Error(`${msg} (${line}:${col})`)
    }
}