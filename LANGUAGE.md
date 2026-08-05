# PlanOut Language Reference

The PlanOut language is a small scripting language for describing how an
experiment assigns values to users. You compile a script to JSON once, then
execute that JSON against a set of inputs to get the parameters for one
particular user.

Facebook's original documentation for the language used to live at
`facebook.github.io/planout`. That site is gone — the project was archived and
its GitHub Pages site returns 404. The source markdown survives in the archived
repo ([`python/docs/07-language.md`](https://github.com/facebookarchive/planout/blob/master/python/docs/07-language.md)),
but it describes the Python implementation, which has features this port
doesn't. This document describes what `planout-ts` actually implements.

The grammar in `src/planout.jison` came from Facebook's implementation, so the
syntax matches. The operator set and the hashing don't fully match — see
[Differences from Facebook PlanOut](#differences-from-facebook-planout).

## Compiling and running a script

```typescript
import { compile, execute } from "planout-ts";

// Compile once — ideally at build time, not per request
const code = compile(`
  # Roll the new checkout flow out to 10% of users
  in_test = bernoulliTrial(p=0.1, unit=userId);
  if (!in_test) {
    return false;
  }
  button_color = uniformChoice(choices=['blue', 'green'], unit=userId);
`);

// Execute per user
const exp = execute("checkout_rollout", code, { userId: "u-12345" });

if (exp.enabled) {
  logExposure("checkout_rollout", exp.getParamsText());
  render(exp.get("button_color", "blue"));
}
```

`compile` returns plain JSON, so you can store the compiled form in a database
or inline it into a page and skip shipping the parser to the browser. `execute`
returns a [`PlanOutExperiment`](https://dobesv.com/planout-ts/classes/PlanOutExperiment.html);
read assigned values off it with `get`.

## Comments

`#` comments out the rest of the line. There is no block comment syntax.

```planout
# this is a comment
x = 1;  # so is this
```

## Values

| Kind | Examples |
| --- | --- |
| Number | `42`, `3.14`, `1e6` |
| String | `'single quoted'`, `"double quoted"` |
| Boolean | `true`, `false` |
| Null | `null` |
| Array | `[1, 2, 3]`, `['a', b, min(1, 2)]` |
| Object | `@{"key": "value", "nested": [1, 2]}` |

Array elements are expressions, so they get evaluated — `['a', b, min(1, 2)]`
with `b` set to `7` produces `["a", 7, 1]`.

Objects are the exception. They need the `@` prefix, and everything after it is
parsed as literal JSON rather than as expressions. You can't reference a
variable inside one: `@{"a": x}` fails at compile time with
`Unexpected token 'x', "x" is not valid JSON`. Keys and string values have to be
double-quoted, as in real JSON. Build objects from variables in your application
code and pass them in as inputs instead.

## Variables

Assignment uses `=` or `<-`. The two are interchangeable; `<-` exists because
upstream PlanOut used it to mark random assignment.

```planout
x = 1;
y <- 2;
```

Reading a variable is just its name. Inputs you pass to `execute` are readable
the same way as anything the script assigned:

```typescript
const exp = execute("exp", compile("tier = accountType;"), {
  accountType: "pro",
});
exp.get("tier"); // 'pro'
```

Reading an undefined variable gives `null` rather than an error.

Assignments and inputs are stored in separate layers. `getParamsText()` and
iteration only see what the script assigned, so your inputs don't leak into the
string you log as the variant description.

## Operators

Listed tightest binding first:

| Operators | Meaning |
| --- | --- |
| `[ ]` | index |
| `( )` | grouping |
| `*` `/` `%` | multiply, divide, modulo |
| `+` `-` | add, subtract, unary negate |
| `==` `!=` `<=` `>=` `>` `<` | comparison |
| `\|\|` `&&` `??` | or, and, coalesce (`??` is **not implemented** — see below) |
| `!` | not |

`&&` and `||` short-circuit, so `false && somethingInvalid` won't throw.

**`&&` does not bind tighter than `||`.** The grammar puts them at the same
precedence level, left-associative, so they group strictly left to right:

```planout
x = true || false && false;    # (true || false) && false  =>  false
x = true || (false && false);  # => true
```

That's the opposite of C, Python, and JavaScript, where `&&` wins. Parenthesize
any expression that mixes the two.

`==` uses JavaScript's loose equality, so `1 == '1'` is true. Arithmetic
operands must be numbers — `'a' + 1` throws
`sum operand 1: expected number but got a` rather than concatenating.

Indexing works on both arrays and objects: `items[0]`, `config["timeout"]`.
Array indices must be numbers and object keys must be strings, or it throws.
Indexing something that isn't an array or object also throws.

## Conditionals

```planout
if (score > 100) {
  tier = 'gold';
} else if (score > 50) {
  tier = 'silver';
} else {
  tier = 'bronze';
}
```

The condition needs parentheses and the branches need braces. Both are stricter
than they look:

- `if (true) x = 9;` is a parse error. An unbraced branch has to be a value
  expression, and an assignment isn't one. Always use braces.
- `if` is a statement, not a value. `tier = if (x) 'a' else 'b';` is a parse
  error. Assign inside each branch instead.

Truthiness follows JavaScript's rules. An `if` whose branches all fail
evaluates to `null` and leaves earlier assignments alone.

Braces used on their own are a block expression, evaluating to the value of the
last statement:

```planout
x = { z = 5; };   # x is 5
```

Blocks don't introduce scope. `z` above is set on the same flat environment as
`x`, and shows up in `getParamsText()` alongside it.

## return

`return` stops the script immediately.

Returning `false` additionally marks the experiment disabled, which is how you
express "this user is not in the experiment":

```planout
if (!eligible) {
  return false;
}
```

Once disabled, `get` ignores everything the script assigned and returns the
default you pass it. Check `exp.enabled` before logging an exposure event —
logging a disabled experiment will pollute your analysis with users who never
saw a variant.

## Calling operators

Operators use function-call syntax. Arguments can be named or positional:

```planout
x = round(2.6);                                        # positional
y = min(4, 2, 9);                                      # positional, several
z = uniformChoice(choices=['a', 'b'], unit=userId);    # named
```

Positional arguments only work for operators that take a single unnamed value
(`round`, `length`, `not`, `negative`) or a list of them (`min`, `max`, `sum`,
`product`, `and`, `or`). **Every random operator requires named arguments.**
Calling `uniformChoice(['a','b'], userId)` positionally throws
`uniformChoice choices: expected array, got null`, because the parser packs
positional arguments into a `values` field and the operator is looking for
`choices` and `unit`.

## Random operators

Each one takes a `unit` — the value that varies per user, which the library
hashes to pick a result. Pass your user ID, client ID, or session ID.

| Operator | Arguments | Returns |
| --- | --- | --- |
| `uniformChoice` | `choices`, `unit` | one element of `choices`, uniformly |
| `weightedChoice` | `choices`, `weights`, `unit` | one element of `choices`, in proportion to `weights` |
| `bernoulliTrial` | `p`, `unit` | `1` with probability `p`, else `0` |
| `bernoulliFilter` | `choices`, `p`, `unit` | the subset of `choices` that independently passed probability `p` |
| `sample` | `choices`, `draws`, `unit` | `draws` elements of `choices`, shuffled |
| `randomInteger` | `min`, `max`, `unit` | integer in `[min, max]`, inclusive |
| `randomFloat` | `min`, `max`, `unit` | float in `[min, max]` |

`weights` must have the same length as `choices`, and `choices` must be
non-empty; both throw otherwise. `p` outside `[0, 1]` throws. `draws` is
required in a script even though the underlying `sample` method defaults it —
omitting it throws `sample draws: expected number but got null`.

`unit` accepts an array, which gets flattened into the hash input. This is how
you decorrelate variables — see the next section.

## Non-random operators

| Operator | Arguments | Returns |
| --- | --- | --- |
| `length` | `value` (array) | element count |
| `round` | `value` (number) | nearest integer |
| `min` / `max` | `values` | smallest / largest |
| `sum` / `product` | `values` | total / product |
| `includes` | `collection`, `value` | whether `collection` contains `value` |

## How assignment is determined

Everything random is derived from one hash:

```
hash(unit) = parseInt(
  sha1(flattenDeep([experimentName, unit]).join(".")).slice(0, 13),
  16
)
```

An array `unit` is flattened and joined with `.`, so `unit=[userId, 'a']` hashes
`experimentName.userId.a`.

The experiment name and the unit are the only inputs. Same name plus same unit
gives the same hash forever, which is what makes a returning user see the same
variant.

**The variable name is not part of the hash.** Two variables assigned from the
same `unit` in the same experiment get the identical hash, and therefore
perfectly correlated assignments:

```planout
a = uniformChoice(choices=['X','Y','Z'], unit=userId);
b = uniformChoice(choices=['X','Y','Z'], unit=userId);
# a and b are always equal — you have one coin flip, not two
```

Vary the unit per variable to get independent assignments:

```planout
a = uniformChoice(choices=['X','Y','Z'], unit=[userId, 'a']);
b = uniformChoice(choices=['X','Y','Z'], unit=[userId, 'b']);
```

This is the difference from upstream PlanOut most likely to bite you. Python
PlanOut salts each variable with its own name by default, so the correlation
never appears there. Here it's on you to vary the unit.

## Behavior when an experiment is disabled

After `return false`, the hash is forced to zero. The random operators don't
stop running — they run against a zero hash, which produces this:

| Operation | Value when disabled |
| --- | --- |
| `get(name, def)` | `def` |
| `hash`, `zeroToOne` | `0` |
| `randomInteger`, `randomFloat` | `min` |
| `uniformChoice`, `weightedChoice` | first element of `choices` |
| `bernoulliTrial` | `1` for any `p > 0`, `0` when `p` is `0` |
| `bernoulliFilter` | all of `choices` |
| `sample` | `draws` elements, deterministically ordered |

The last three are worth calling out because the doc comments on those methods
claim they return `0` and `[]` when disabled. They don't — a zero hash is
*below* every threshold, so `bernoulliTrial` passes and `bernoulliFilter` keeps
everything. Don't rely on the return values of a disabled experiment. Gate on
`exp.enabled` and read parameters through `get` with an explicit default, which
does behave as documented.

## Not implemented

These parse without complaint and then throw `Unsupported op: <name>` when you
execute or inspect them:

| Syntax | Compiles to | Status |
| --- | --- | --- |
| `a ?? b` | `coalesce` | throws `Unsupported op: coalesce` |
| `switch { cond => expr; }` | `switch` | throws `Unsupported op: switch` |

Because the failure is at execution rather than compile time, a script using
either one looks fine in CI if you only test `compile`. Avoid both. Use
`if`/`else` in place of `switch`, and an explicit `if (x == null)` in place of
`??`.

Namespaces — upstream PlanOut's mechanism for splitting traffic across mutually
exclusive experiments — aren't implemented either, in the language or the API.

## Differences from Facebook PlanOut

| | planout-ts | Facebook PlanOut |
| --- | --- | --- |
| Per-variable salt | none; you vary `unit` yourself | variable name salts the hash automatically |
| Hash width | 13 hex chars of the SHA-1 | 15 hex chars |
| `coalesce`, `switch` | parse but don't execute | supported |
| Namespaces | not implemented | supported |
| Logging / experiment framework | not included; log exposures yourself | included |

The differing hash width and missing per-variable salt mean **assignments from
this library do not match any other PlanOut implementation**. Don't split one
experiment's traffic across planout-ts and another port expecting users to land
in the same bucket.

## Inspecting a script

`inspect` walks a script without assigning anything and reports the parameters
it could set, along with their possible values. Use it to build an admin UI or
to validate a script before deploying it.

```typescript
import { compile, inspect } from "planout-ts";

const { parameters } = inspect(
  compile("color = uniformChoice(choices=['red','blue'], unit=userId);")
);
```

`inspect` shares the interpreter's operator coverage, so it throws on
`coalesce` and `switch` too.
