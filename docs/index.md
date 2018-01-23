 * [src/parser.ts](#srcparserts)
   * [class Parser](#classparser)
   * [Parser.prototype.parse](#parserprototypeparse)
   * [Parser.prototype.print](#parserprototypeprint)
   * [Parser.prototype.path](#parserprototypepath)
   * [Parser.prototype.segment](#parserprototypesegment)
   * [Parser.prototype.params](#parserprototypeparams)
   * [Parser.prototype.concat](#parserprototypeconcat)
   * [Parser.prototype.embed](#parserprototypeembed)
   * [Parser.prototype.extra](#parserprototypeextra)
   * [tag](#tag)
   * [custom](#custom)
   * [oneOf](#oneof)
 * [src/adapter.ts](#srcadapterts)
   * [AdapterBase.prototype.withName](#adapterbaseprototypewithname)
   * [AdapterBase.prototype.withDefault](#adapterbaseprototypewithdefault)
   * [AdapterBase.prototype.dimap](#adapterbaseprototypedimap)
   * [class TotalAdapter](#classtotaladapter)
   * [class PartialAdapter](#classpartialadapter)
   * [class PartialAndTotalAdapter](#classpartialandtotaladapter)
   * [class NamedAdapter](#classnamedadapter)
   * [array](#array)
   * [literals](#literals)
   * [of](#of)
   * [partialAdapter](#partialadapter)
   * [totalAdapter](#totaladapter)
   * [partialAndTotalAdapter](#partialandtotaladapter)
 * [src/option.ts](#srcoptionts)
   * [OptionBase.prototype.map](#optionbaseprototypemap)
   * [OptionBase.prototype.chain](#optionbaseprototypechain)
   * [OptionBase.prototype.fold](#optionbaseprototypefold)
   * [OptionBase.prototype.withDefault](#optionbaseprototypewithdefault)
   * [class None](#classnone)
   * [class Some](#classsome)
   * [traverse](#traverse)


## src/parser.ts

### class Parser

`Parser` also used as printer, represents mutual correspondence
between relative url strings and some intermediate data structure,
usually named `Route`

```ts
type Route = 
   | { tag: 'Home' }
   | { tag: 'Blog', category: 'art'|'science', page: number }
   | { tag: 'Contacts' }

const parser = r.oneOf(
   r.tag('Home'),
   r.tag('Blog').path('/blog').segment('category', r.literals('art', 'science')).params({ page: r.nat.withDefault(1) }),
   r.tag('Contacts').path('/contacts'),
);

console.log(parser.parse('/blog/art')); // => { tag: 'Blog', category: 'art', page: 1 }
console.log(parser.parse('/blog/unknown')); // => null
console.log(parser.print({ tag: 'Blog', category: 'science', page: 3 })); // => "/blog/science?page=3"
console.log(parser.print({ tag: 'Home' })); // => ""
```

### Parser.prototype.parse

```
parse(url: string): O;
```

Try to match given string against the rules 

### Parser.prototype.print

```
print(route: I): string;
```

Convert result of parsing back into url. Reverse of `parse` 

### Parser.prototype.path

```
path(path: string): Parser<O, I, Extra>;
```

Add path segments to parser

### Parser.prototype.segment

```
segment<K extends string, B>(key: K, adapter: HasTotalAdapter<B>): Parser<O & { [k in K]: B; }, I & { [k in K]: B; }, Extra>;
```

Parse one path segment

```ts
const categoryAdapter = r.literals('electronics', 'art', 'music');
const parser = r.path('/category').segment('category', categoryAdapter).segment('page', r.nat);
console.log(parser.parse('/category/art/10')); // => { category: "art", page: 10 }
console.log(parser.parse('/category/art')); // => null
console.log(parser.print({ category: 'music', page: 1 })); // => "category/music/1"
```

### Parser.prototype.params

```
params<Keys extends Record<string, HasPartialAdapter<any>>>(params: Keys): Parser<O & { [k in keyof Keys]: Keys[k]["_A"]; }, I & { [k in keyof Keys]: Keys[k]["_A"]; }, Extra>;
```

Add query string parameters

```ts
const parser = r.path('/shop/items').params({ offset: r.nat.withDefault(0), limit: r.nat.withDefault(20), search: r.string.withDefault('') });
console.log(parser.parse('/shop/items')); // => { offset: 0, limit: 20, search: "" }
console.log(parser.print({ offset: 20, limit: 20, search: "bana" })); // => "shop/items?offset=20&search=bana"
```

### Parser.prototype.concat

```
concat<That extends Parser<any, any, any>>(that: That): Parser<O & That["_O"], I & That["_I"], Extra & That["_Extra"]>;
```

Join two parsers together. Result will be merged

```ts
const blog = r.path('/blog').params({ page: r.nat.withDefault(1) });
const parser = r.tag('Blog').path('/website').concat(blog);
console.log(parser.parse('/website/blog')); // => { tag: "Blog", page: 1 }
console.log(parser.print({ tag: "Blog", page: 10 })); // => "website/blog?page=10"
```

### Parser.prototype.embed

```
embed<K extends string, That extends Parser<any, any, any>>(key: K, that: That): Parser<O & { [k in K]: That["_O"]; }, I & { [k in K]: That["_I"]; }, Extra>;
```

Join two parsers together. Result of the second will be stored in
the field `key`

```ts
const blog = r.path('/blog').params({ page: r.nat.withDefault(1) });
const parser = r.tag('Blog').path('/website').concat(blog);
console.log(parser.parse('/website/blog')); // => { tag: "Blog", page: 1 }
console.log(parser.print({ tag: "Blog", page: 10 })); // => "website/blog?page=10"
```

### Parser.prototype.extra

```
extra<E>(payload: E): Parser<O & E, I, Extra & E>;
```

Add some extra fields to the output. These fields are not
required in input, i.e. in `Parser.prototype.print`. This is
convenient way to store related information and keep
configuration in one place.

```ts
const parser = r.oneOf(
   r.tag('Shop').path('/shop').extra({ component: require('./Shop') }),
   r.tag('Blog').path('/blog').extra({ component: require('./Blog') }),
   r.tag('Contacts').path('/contacts').extra({ component: require('./Contacts') }),
);
console.log(parser.parse('/contacts')); // => { tag: "Contacts", component: Shop { ... } }
console.log(parser.print({ tag: "Contacts" })); // => "contacts"
```

### tag

```
function tag<T extends string>(tag: T): Parser<{ tag: T; }, { tag: T; }, { tag: T; }>;
```

Tag route with a uniq key in order to use in `oneOf` 

### custom

```
function custom<O, I = O>(parse: (s: ParserState) => [O, ParserState][], print: (a: I) => [string[], Record<string, string>]): Parser<O, I, {}>;
```

Implement custom parser

### oneOf

```
function oneOf<P1 extends Parser<any, any, { tag: string; }>>(a: P1): Parser<P1["_O"], P1["_I"], {}>;
function oneOf<P1 extends Parser<any, any, { tag: string; }>, P2 extends Parser<any, any, { tag: string; }>>(a: P1, b: P2): Parser<(P1 | P2)["_O"], (P1 | P2)["_I"], {}>;
function oneOf<P1 extends Parser<any, any, { tag: string; }>, P2 extends Parser<any, any, { tag: string; }>, P3 extends Parser<any, any, { tag: string; }>>(a: P1, b: P2, c: P3): Parser<(P1 | P2 | P3)["_O"], (P1 | P2 | P3)["_I"], {}>;
function oneOf<P1 extends Parser<any, any, { tag: string; }>, P2 extends Parser<any, any, { tag: string; }>, P3 extends Parser<any, any, { tag: string; }>, P4 extends Parser<any, any, { tag: string; }>>(a: P1, b: P2, c: P3, d: P4): Parser<(P1 | P2 | P3 | P4)["_O"], (P1 | P2 | P3 | P4)["_I"], {}>;
function oneOf<P1 extends Parser<any, any, { tag: string; }>, P2 extends Parser<any, any, { tag: string; }>, P3 extends Parser<any, any, { tag: string; }>, P4 extends Parser<any, any, { tag: string; }>, P5 extends Parser<any, any, { tag: string; }>>(a: P1, b: P2, c: P3, d: P4, e: P5): Parser<(P1 | P2 | P3 | P4 | P5)["_O"], (P1 | P2 | P3 | P4 | P5)["_I"], {}>;
function oneOf<P1 extends Parser<any, any, { tag: string; }>, P2 extends Parser<any, any, { tag: string; }>, P3 extends Parser<any, any, { tag: string; }>, P4 extends Parser<any, any, { tag: string; }>, P5 extends Parser<any, any, { tag: string; }>, P6 extends Parser<any, any, { tag: string; }>>(a: P1, b: P2, c: P3, d: P4, e: P5, f: P6): Parser<(P1 | P2 | P3 | P4 | P5 | P6)["_O"], (P1 | P2 | P3 | P4 | P5 | P6)["_I"], {}>;
function oneOf<P1 extends Parser<any, any, { tag: string; }>, P2 extends Parser<any, any, { tag: string; }>, P3 extends Parser<any, any, { tag: string; }>, P4 extends Parser<any, any, { tag: string; }>, P5 extends Parser<any, any, { tag: string; }>, P6 extends Parser<any, any, { tag: string; }>, P7 extends Parser<any, any, { tag: string; }>>(a: P1, b: P2, c: P3, d: P4, e: P5, f: P6, g: P7): Parser<(P1 | P2 | P3 | P4 | P5 | P6 | P7)["_O"], (P1 | P2 | P3 | P4 | P5 | P6 | P7)["_I"], {}>;
function oneOf<P1 extends Parser<any, any, { tag: string; }>, P2 extends Parser<any, any, { tag: string; }>, P3 extends Parser<any, any, { tag: string; }>, P4 extends Parser<any, any, { tag: string; }>, P5 extends Parser<any, any, { tag: string; }>, P6 extends Parser<any, any, { tag: string; }>, P7 extends Parser<any, any, { tag: string; }>, P8 extends Parser<any, any, { tag: string; }>>(a: P1, b: P2, c: P3, d: P4, e: P5, f: P6, g: P7, h: P8): Parser<(P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8)["_O"], (P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8)["_I"], {}>;
function oneOf<P1 extends Parser<any, any, { tag: string; }>, P2 extends Parser<any, any, { tag: string; }>, P3 extends Parser<any, any, { tag: string; }>, P4 extends Parser<any, any, { tag: string; }>, P5 extends Parser<any, any, { tag: string; }>, P6 extends Parser<any, any, { tag: string; }>, P7 extends Parser<any, any, { tag: string; }>, P8 extends Parser<any, any, { tag: string; }>, P9 extends Parser<any, any, { tag: string; }>>(a: P1, b: P2, c: P3, d: P4, e: P5, f: P6, g: P7, h: P8, i: P9): Parser<(P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9)["_O"], (P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9)["_I"], {}>;
function oneOf<array extends Parser<any, any, { tag: string; }>[]>(array: array): Parser<array[number]["_O"], array[number]["_I"], {}>;
```

Combine multiple alternative parsers. All parsers should be
constructed with `tag`

```ts
const parser = r.oneOf([
   r.tag('First').path('/first'),
   r.tag('Second').path('/second'),
   r.tag('Third').path('/third'),
]);
console.log(parser.parse('/first')); // => { tag: "First" }
console.log(parser.parse('/second')); // => { tag: "Second" }
console.log(parser.print({ tag: 'Third' })); // => "third"
```



## src/adapter.ts

### AdapterBase.prototype.withName

```
withName(this: HasPartialAdapter<A>, name: string): NamedAdapter<A>;
```

Give different name to parameter compared with the name of the field

```ts
const parser = r.path('/home').params({ snakeCase: r.nat.withName('snake_case') });
console.log(parser.print({ snakeCase: 42 }));  // => "home?snake_case=42"
```

### AdapterBase.prototype.withDefault

```
withDefault(this: TotalAdapter<A>, defaultVal: A): TotalAdapter<A>;
withDefault<B>(this: PartialAndTotalAdapter<A>, defaultVal: B): PartialAdapter<A | B>;
withDefault<B>(this: PartialAdapter<A>, defaultVal: B): PartialAdapter<A | B>;
withDefault<B>(this: NamedAdapter<A>, defaultVal: B): NamedAdapter<A | B>;
withDefault<B>(this: Adapter<A>, defaultVal: B): Adapter<A | B>;
```

Provide default value, new adapter will always succeed 

```ts
const parser = r.path('shop/items').params({ search: r.string.withDefault(''), page: r.nat.withDefault(1) });
console.log(parser.parse('/shop/items')); // => { search: "", page: 1 }
console.log(parser.print({ search: 'apples', page: 2 })); // => "shop/items?search=apples&page=2"
console.log(parser.print({ search: '', page: 1 })); // => "shop/items"
```

### AdapterBase.prototype.dimap

```
dimap<B>(this: TotalAdapter<A>, f: (a: A) => B, g: (b: B) => A): TotalAdapter<B>;
dimap<B>(this: PartialAndTotalAdapter<A>, f: (a: A) => B, g: (b: B) => A): PartialAndTotalAdapter<B>;
dimap<B>(this: PartialAdapter<A>, f: (a: A) => B, g: (b: B) => A): PartialAdapter<B>;
dimap<B>(this: NamedAdapter<A>, f: (a: A) => B, g: (b: B) => A): NamedAdapter<B>;
dimap<B>(this: Adapter<A>, f: (a: A) => B, g: (b: B) => A): Adapter<B>;
```

Change type variable inside `Adapter`, similar to
`Array.prototype.map`, but requires two functions

```ts
const litAdapter = r.literals('one', 'two', 'three');
const choiceAdapter = litAdapter.dimap(
   n => ['one', 'two', 'three'].indexOf(n) + 1,
   n => ['one', 'two', 'three'][n - 1] as any,
);
const parser = r.path('/quiz').params({ choice: choiceAdapter });
console.log(parser.parse('/quiz?choice=three')); // => { choice: 3 }
console.log(parser.print({ choice: 1 })); // => "quiz?choice=one"
```

### class TotalAdapter

`TotalAdapter<A>` describes mutual correspondence between `string`
and `A`. These adapters are used in `r.array` and `r.segment`

### class PartialAdapter

`PartialAdapter<A>` describes mutual correspondence between
`Option<string>` and `A`. These adapters are used in `r.param`

### class PartialAndTotalAdapter

Combination of `TotalAdapter<A>` and `PartialAdapter<A>` 

### class NamedAdapter

Contains another adapter with its name 

### array

```
function array<A>(adapter: HasTotalAdapter<A>): PartialAndTotalAdapter<A[]>;
```

Comma-separated list

```ts
const statusAdapter = r.literals('pending', 'scheduled', 'done');
const parser = r.path('/todos').params({ statuses: r.array(statusAdapter) });
type Route = typeof parser['_O']; // { statuses: Array<'pending'|'scheduled'|'done'> }
console.log(parser.print({ statuses: ['pending', 'scheduled'] })); // => "todos?statuses=pending,scheduled"
```

### literals

```
function literals<A extends string>(a: A): PartialAndTotalAdapter<A>;
function literals<A extends string, B extends string>(a: A, b: B): PartialAndTotalAdapter<A | B>;
function literals<A extends string, B extends string, C extends string>(a: A, b: B, c: C): PartialAndTotalAdapter<A | B | C>;
function literals<A extends string, B extends string, C extends string, D extends string>(a: A, b: B, c: C, d: D): PartialAndTotalAdapter<A | B | C | D>;
function literals<A extends string, B extends string, C extends string, D extends string, E extends string>(a: A, b: B, c: C, d: D, e: E): PartialAndTotalAdapter<A | B | C | D | E>;
function literals<array extends Expr[]>(array: array): PartialAndTotalAdapter<array[number]>;
```

Union of string literals

```ts
const fruitAdapter = r.literals('apple', 'orange', 'banana');
const parser = r.path('/fruits').segment('fruit', fruitAdapter);
type Route = typeof parser['_O']; // { fruit: 'apple'|'orange'|'banana' }
console.log(parser.print({ fruit: 'apple' })); // => "fruits/apple"
console.log(parser.parse('fruits/apple')); // => { fruit: "apple" }
console.log(parser.parse('fruits/potato')); // => null
```

### of

```
function of<A extends Expr>(a: A): PartialAndTotalAdapter<A>;
```

Create adapter that always succeeds with the given value 

### partialAdapter

```
function partialAdapter<A>(applyPartial: (s: Option<string>) => Option<A>, unapplyPartial: (a: A) => Option<string>): PartialAdapter<A>;
```

Constructor for `PartialAdapter` 

### totalAdapter

```
function totalAdapter<A>(applyTotal: (s: string) => Option<A>, unapplyTotal: (a: A) => string): TotalAdapter<A>;
```

Constructor for `TotalAdapter` 

### partialAndTotalAdapter

```
function partialAndTotalAdapter<A>(applyTotal: (s: string) => Option<A>, unapplyTotal: (a: A) => string, applyPartial: (s: Option<string>) => Option<A>, unapplyPartial: (a: A) => Option<string>): PartialAndTotalAdapter<A>;
```

Constructor for `PartialAndTotalAdapter` 



## src/option.ts

### OptionBase.prototype.map

```
map<B>(f: (a: A) => B): Option<B>;
```

Apply function `f` to the underlying value 

### OptionBase.prototype.chain

```
chain<B>(f: (a: A) => Option<B>): Option<B>;
```

Extract value from `this` then apply `f` to the result 

### OptionBase.prototype.fold

```
fold<B extends Expr, C extends Expr>(fromNone: B, fromSome: (x: A) => C): B | C;
```

Unwrap underlying value 

### OptionBase.prototype.withDefault

```
withDefault<B extends Expr>(fromNone: B): A | B;
```

Unwrap value by providing result for `None` case 

### class None

Class which instances denote absence of value, similar to `null` and
`undefined`

### class Some

Contains one single value 

### traverse

```
function traverse<A, B>(xs: A[], f: (a: A) => Option<B>): Option<B[]>;
```

Apply `f` to each element of `xs` and collect the results

```ts
const safeDiv = (a: number, b: number) => b === 0 ? none : some(a / b);
const divisors1 = [1, 2, 3, 4];
const divisors2 = [0, 1, 2, 3];
console.log(traverse(divisors1, b => safeDiv(10, b))); // => Some { value: [...] }
console.log(traverse(divisors2, b => safeDiv(10, b))); // => None { }
```


