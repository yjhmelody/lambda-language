function makejs(expr) {
    return js(expr)

    function js(expr) {
        switch (expr.type) {
            case 'num':
            case 'str':
            case 'bool':
                return jsAtom(expr)
            case 'var':
                return jsVar(expr)
            case 'binary':
                return jsBinary(expr)
            case 'assign':
                return jsAssign(expr)
            case 'let':
                return jsLet(expr)
            case 'lambda':
                return jsLambda(expr)
            case 'if':
                return jsIf(expr)
            case 'prog':
                return jsProg(expr)
            case 'call':
                return jsCall(expr)
            default:
                throw new SyntaxError('cannot make js for ', JSON.stringify(expr))
        }
    }

    function jsAtom(expr){
        return JSON.stringify(expr.value)
    }

    function makeVar(name){
        return name
    }

    function jsVar(expr){
        return makeVar(expr.value)
    }

    function jsBinary(expr){
        return '(' + js(expr.left) + expr.operator + js(expr.right) + ')'
    }

    function jsAssign(expr){
        return jsBinary(expr)
    }

    function jsLambda(expr){
        let code = '(function '
        if(expr.name){
            code += makeVar(expr.name)
        }
        code += '(' + expr.vars.map(makeVar).join(', ') + ') {'
        code += 'return ' + js(expr.body) + '})'
        return code
    }
}