# The lambda-language
[![complier](https://img.shields.io/badge/lambda--langugage-complier-blue.svg)](https://github.com/yjhmelody/lambda-language)
[![version](https://img.shields.io/badge/version-0.3.6-blue.svg)](https://github.com/yjhmelody/lambda-language)
[![npm](https://img.shields.io/npm/dm/lambda-language.svg)](https://www.npmjs.com/package/lambda-language)

---
## Install

```
$ npm install lambda-language
```

## Syntax

ref the [example](./demo/demo1)

## API

The following are located in the corresponding file in `src`

* InputStream: output lex
* TokenStream: output token
* parser: output ast
* codeGen: complier the ast to JS
* Environment: store variables
* Environment.Execute: execute ast with guarding stack 
* Environment.evalute: eval ast expression with an env


## Run the language

```
$ bin/lambda demo
```

## Compile the language to JS

```
$ bin/code-to-js demo2 [demo2.js]
```

### Some examples about syntax

```
print_range = λ(a, b) if a <= b {
                        println(a);
                        if a + 1 <= b {
                          print_range(a + 1, b);
                        } 
                        else 
                          println("");
                      };
print_range(1, 10);
```

output:
```
1
2
3
4
5
6
7
8
9 
10
```

```
cons = λ(a, b) λ(f) f(a, b);
car = λ(cell) cell(λ(a, b) a);
cdr = λ(cell) cell(λ(a, b) b);
NIL = λ(f) f(NIL, NIL);

x = cons(1, cons(2, cons(3, cons(4, cons(5, NIL)))));
println(car(x));                      # 1
println(car(cdr(x)));                 # 2
println(car(cdr(cdr(x))));            # 3
println(car(cdr(cdr(cdr(x)))));       # 4
println(car(cdr(cdr(cdr(cdr(x))))));  # 5
```

output:
```
1
2
3
4
5
```

binded with some nodejs functions
```
code = fs-readFileSync("./demo");
println(code);
println(os-arch());
```