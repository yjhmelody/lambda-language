
module.exports = InputStream


/**
 * 
 * The character input stream
 * @param {string} input 
 * @returns {Object} inputstream, can do something on one symbol; used by TokenStream
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
