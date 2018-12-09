 * [src/parser.ts](#srcparserts)
   * [type Parser](#typeparser)
   * [ParserBase.prototype.parse](#parserbaseprototypeparse)
   * [ParserBase.prototype.print](#parserbaseprototypeprint)
   * [ParserBase.prototype.parseAll](#parserbaseprototypeparseall)
   * [ParserBase.prototype.path](#parserbaseprototypepath)
   * [ParserBase.prototype.segment](#parserbaseprototypesegment)
   * [ParserBase.prototype.params](#parserbaseprototypeparams)
   * [ParserBase.prototype.merge](#parserbaseprototypemerge)
   * [ParserBase.prototype.embed](#parserbaseprototypeembed)
   * [ParserBase.prototype.extra](#parserbaseprototypeextra)
   * [ParserBase.prototype.toOutput](#parserbaseprototypetooutput)
   * [tag](#tag)
   * [custom](#custom)
   * [oneOf](#oneof)
   * [type UrlChunks](#typeurlchunks)
 * [src/adapter.ts](#srcadapterts)
   * [type Adapter](#typeadapter)
   * [AdapterBase.prototype.apply](#adapterbaseprototypeapply)
   * [AdapterBase.prototype.unapply](#adapterbaseprototypeunapply)
   * [AdapterBase.prototype.applyOption](#adapterbaseprototypeapplyoption)
   * [AdapterBase.prototype.unapplyOption](#adapterbaseprototypeunapplyoption)
   * [AdapterBase.prototype.withName](#adapterbaseprototypewithname)
   * [AdapterBase.prototype.withDefault](#adapterbaseprototypewithdefault)
   * [AdapterBase.prototype.dimap](#adapterbaseprototypedimap)
   * [array](#array)
   * [literals](#literals)
   * [of](#of)
   * [custom](#custom)
 * [src/option.ts](#srcoptionts)
   * [OptionBase.prototype.map](#optionbaseprototypemap)
   * [OptionBase.prototype.chain](#optionbaseprototypechain)
   * [OptionBase.prototype.fold](#optionbaseprototypefold)
   * [OptionBase.prototype.withDefault](#optionbaseprototypewithdefault)
   * [OptionBase.prototype.or](#optionbaseprototypeor)
   * [class None](#classnone)
   * [class Some](#classsome)
   * [traverse](#traverse)


## src/parser.ts

### type Parser

```
export type Parser<O={}, I=O> =
  | Params<O, I>  // { _params: Record<string, Adapter<any>> }
  | Segment<O, I> // { _key: string, _adapter: Adapter<any> }
  | Embed<O, I>   // { _key: string, _parser: Parser<unknown> }
  | OneOf<O, I>   // { _tags: Record<string, Parser<unknown>>, _prefixTrie?: PrefixTrie }
  | Path<O, I>    // { _segments: string[] }
  | Extra<O, I>   // { _payload: object }
  | Custom<O, I>  // { _parse(s: ParserState): Array<[O, ParserState]>, _print(a: I): UrlChunks }
  | Merge<O, I>   // { _first: Parser<object>, _second: Parser<object> }
  ;
```

Parser defines rules for matching urls to some intermediate
structure of type `O` (O for output). All parsers are invertible,
i.e. you can get back original url from an `I` using method
`print`. `I` (for input) is usually the same type as `O`, but some
fields could be optional

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

### ParserBase.prototype.parse

```
parse(url: string): O;
```

Try to match given string to an `O`

### ParserBase.prototype.print

```
print(route: I): string;
```

Inverse of `parse`. Convert result of parsing back into url.

### ParserBase.prototype.parseAll

```
parseAll(url: string): O[];
```

Similar to `parse`, but returns all intermediate routes

```ts
const parser = r.oneOf(
  r.tag('Home').path('/'),
  r.tag('Shop').path('/shop'),
  r.tag('Item').path('/shop/item').segment('id', r.nestring),
);
console.log(parser.parseAll('/shop/item/42'));
// => [{ tag: 'Item', id: '42' }, { tag: 'Shop' }, { tag: 'Home' }]
```

### ParserBase.prototype.path

```
path(path: string): Merge<O, I>;
```

Add path segments to parser

```ts
const parser = t.tag('Contacts').path('/my/contacts/');
console.log(parser.print({ tag: 'Contacts' })); // => "my/contacts"
```

### ParserBase.prototype.segment

```
segment<K extends string, A extends Adapter<any, { nonEmpty: true; }>>(key: K, adapter: A): Parser<O & { [K_ in K]: A["_A"]; }, I & { [K in keyof { [K_ in K]: A; }]: { [K_ in K]: A; }[K] extends Adapter<infer A, { hasDefault: any; }> ? { [K_ in K]?: A; } : { [K_ in K]: A; }[K] extends Adapter<infer A, any> ? { [K_ in K]: A; } : never; }[K]>;
```

Check one path segment with adapter and store the result in the
given field

```ts
const parser = r.path('/shop').segment('category', r.nestring).segment('page', r.nat);
console.log(parser.parse('/category/art/10')); // => { category: "art", page: 10 }
console.log(parser.parse('/category/art')); // => null
console.log(parser.print({ category: 'music', page: 1 })); // => "category/music/1"
```

### ParserBase.prototype.params

```
params<R extends Record<string, Adapter<any, {}>>>(params: R): Parser<O & OutParams<R>, I & { [K in keyof R]: R[K] extends Adapter<infer A, { hasDefault: any; }> ? { [K_ in K]?: A; } : R[K] extends Adapter<infer A, any> ? { [K_ in K]: A; } : never; }[keyof R]>;
```

Add query parameters

```ts
const parser = r.path('/shop/items').params({ offset: r.nat.withDefault(0), limit: r.nat.withDefault(20), search: r.string.withDefault('') });
console.log(parser.parse('/shop/items')); // => { offset: 0, limit: 20, search: "" }
console.log(parser.print({ offset: 20, limit: 20, search: "bana" })); // => "shop/items?offset=20&search=bana"
```

### ParserBase.prototype.merge

```
merge<That extends Parser<any, any>>(that: That): Merge<O & That["_O"], I & That["_I"]>;
```

Join two parsers together. Underlying types will be combined through
intersection. That is, the fields will be merged

```ts
const blog = r.path('/blog').params({ page: r.nat.withDefault(1) });
const parser = r.tag('Blog').path('/website').concat(blog);
console.log(parser.parse('/website/blog')); // => { tag: "Blog", page: 1 }
console.log(parser.print({ tag: "Blog", page: 10 })); // => "website/blog?page=10"
```

### ParserBase.prototype.embed

```
embed<K extends string, That extends Parser<any, any>>(key: K, that: That): Merge<O & { [k in K]: That["_O"]; }, I & { [k in K]: That["_I"]; }>;
```

Join two parsers together. Result of the second parser will be
stored in the field `key`

```ts
const blog = r.path('/blog').params({ page: r.nat.withDefault(1) });
const parser = r.tag('Blog').path('/website').concat(blog);
console.log(parser.parse('/website/blog')); // => { tag: "Blog", page: 1 }
console.log(parser.print({ tag: "Blog", page: 10 })); // => "website/blog?page=10"
```

### ParserBase.prototype.extra

```
extra<E extends {}>(payload: E): Merge<O & E, I>;
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

### ParserBase.prototype.toOutput

```
toOutput(input: I): O;
```

Add additional fields to `I`

### tag

```
function tag<T extends string>(tag: T): Parser<{ tag: T; }, { tag: T; }>;
```

Provide parser with a unique key in order to use it in `oneOf`

### custom

```
function custom<O, I = O>(parse: (s: ParserState) => [O, ParserState][], print: (a: I) => [string[], Record<string, string>]): Custom<O, I>;
```

Construct a custom parser

### oneOf

```
function oneOf<P extends Parser<{ tag: string; }, { tag: string; }>[]>(...args: P): OneOf<P[number]["_O"], P[number]["_I"]>;
function oneOf<P extends Parser<{ tag: string; }, { tag: string; }>[]>(array: P): OneOf<P[number]["_O"], P[number]["_I"]>;
```

Combine multiple alternative parsers. All parsers should be
provided with a `tag`

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

### type UrlChunks

```
export type UrlChunks = [string[], Record<string, string>];
```

Deconstructed url. The first element of the tuple is the list of
path segments and the second is query string dictionary. This type
is used as the result type of `doPrint`



## src/adapter.ts

### type Adapter

```
export type Adapter<A, F={}> =
  | CustomAdapter<A, F>  // { _apply: (s: string) => Option<A>, _unapply: (a: A) => string }
  | DefaultAdapter<A, F> // { _adapter: Adapter<A, any>, _default: A }
  | NamedAdapter<A, F>   // { _adapter: Adapter<A, any>, _name: string }
  | DimapAdapter<A, F>   // { _map: (x: B) => A, _comap: (x: A) => B, _adapter: Adapter<B, F> }
  | HasAdapter<A, F>     // { toAdapter(): Adapter<A, F> }
  ;
```

Partial isomorphism between `string` and `A`. Parameter `F`
contains type-level flags for distinguishing different kinds of
adapters. An adapter can be thought of as just a pair of functions
like in this simplified definition

```ts
type Adapter<A> = {
  apply(s: string): Option<A>;
  unapply(a: A): string;
};
```

### AdapterBase.prototype.apply

```
apply(s: string): Option<A>;
```

Try to match a string to a value of type `A`

### AdapterBase.prototype.unapply

```
unapply(a: A): string;
```

Inverse of `apply`. Serialize an `A` back into a string

### AdapterBase.prototype.applyOption

```
applyOption(s: Option<string>): Option<A>;
```

Similar to `apply` but also handles lack of the input (when the
key doesn't exist in query parameters)

### AdapterBase.prototype.unapplyOption

```
unapplyOption(a: A): Option<string>;
```

Inverse of `applyOption`

### AdapterBase.prototype.withName

```
withName(name: string): NamedAdapter<A, F>;
```

Provide different parameter name

```ts
const parser = r.path('/home').params({ snakeCase: r.nat.withName('snake_case') });
console.log(parser.print({ snakeCase: 42 }));  // => "home?snake_case=42"
```

### AdapterBase.prototype.withDefault

```
withDefault<B>(_default: B): DefaultAdapter<A | B, F & { hasDefault: true; }>;
```

Provide default value. This value will be used when the key
doesn't exist in the query parameters

```ts
const parser = r.path('shop/items').params({ search: r.string.withDefault(''), page: r.nat.withDefault(1) });
console.log(parser.parse('/shop/items')); // => { search: "", page: 1 }
console.log(parser.print({ search: 'apples', page: 2 })); // => "shop/items?search=apples&page=2"
console.log(parser.print({ search: '', page: 1 })); // => "shop/items"
```

### AdapterBase.prototype.dimap

```
dimap<B>(map: (a: A) => B, comap: (b: B) => A): DimapAdapter<B, F, A>;
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

### array

```
function array<A>(adapter: Adapter<A, any>): CustomAdapter<A[], {}>;
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
function literals<A extends string[]>(...a: A): Adapter<A, {}>;
function literals<array extends Expr[]>(array: array): Adapter<array[number], {}>;
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
function of<A extends Expr>(a: A): CustomAdapter<A, {}>;
```

Create adapter that always succeeds with the given value

### custom

```
function custom<A>(apply: (s: string) => Option<A>, unapply: (a: A) => string): CustomAdapter<A, {}>;
```

Constructor for `CustomAdapter`



## src/option.ts

### OptionBase.prototype.map

```
map<B>(proj: (a: A) => B): Option<B>;
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

### OptionBase.prototype.or

```
or<B>(that: Option<B>): Option<A | B>;
```

Similar to `||` operation with nullable types

### class None

Class which instances represent absence of value, similar to `null` and
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


