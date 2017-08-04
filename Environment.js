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

 class Environment{
     constructor(parent){
         this.vars = Object.create(parent ? parent.vars : null)
         this.parent = parent
     }
    
     extend(){
         return new Environment(this)
     }

     lookup(name){
         // environment
         let scope = this
         while(scope){
             if(Object.prototype.hasOwnProperty.call(scope.vars, name)){
                 return scope
             }
             scope = scope.parent
         }
     }

     get(name){
        if(name in this.vars){
            return this.vars[name]
        }
        throw new ReferenceError('Undefined variable' + name)
     }

     set(name, value){
        let scope = this.lookup(name)
        // let's not allow defining globals from a nested environment
        if(!scope && this.parent){
            throw new ReferenceError('Undefined variable' + name)        
        }
        return (scope || this).vars[name] = value
     }
     
     def(name, value){
         // current scope variable
         return this.vars[name] = value
     }
 }