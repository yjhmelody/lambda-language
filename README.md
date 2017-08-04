# lambda-language

## The toy language is written by javascript(basic now)

### example

```
print_range = λ(a, b) if a <= b {
                        print(a);
                        if a + 1 <= b {
                          print(", ");
                          print_range(a + 1, b);
                        } 
                        else 
                          println("");
                      };
print_range(1, 10);
```
output:
```
1, 2, 3, 4, 5, 6, 7, 8, 9, 10
***Result: false
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
***Result: false
```