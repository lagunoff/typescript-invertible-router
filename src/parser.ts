import { some, none, Option, Some, None } from './option';
import { Adapter, CustomAdapter, NamedAdapter, DimapAdapter, DefaultAdapter, HasAdapter } from './adapter';
import isEqual from './internal/isequal';
import makeIterator from './internal/parser-iterator';
import prepareOneOf from './internal/prepare-oneof';
import { absurd } from './internal/types';


// Invertible url parser library
// http://www.informatik.uni-marburg.de/~rendel/unparse/rendel10invertible.pdf
// https://github.com/evancz/url-parser/tree/2.0.1


/**
 * Parser defines rules for matching urls to some intermediate
 * structure of type `O` (O for output). All parsers are invertible,
 * i.e. you can get back original url from an `I` using method
 * `print`. `I` (for input) is usually the same type as `O`, but some
 * fields could be optional
 * 
 * ```ts
 * type Route = 
 *   | { tag: 'Home' }
 *   | { tag: 'Blog', category: 'art'|'science', page: number }
 *   | { tag: 'Contacts' }
 * 
 * const parser = r.oneOf(
 *   r.tag('Home'),
 *   r.tag('Blog').path('/blog').segment('category', r.literals('art', 'science')).params({ page: r.nat.withDefault(1) }),
 *   r.tag('Contacts').path('/contacts'),
 * );
 * 
 * console.log(parser.parse('/blog/art')); // => { tag: 'Blog', category: 'art', page: 1 }
 * console.log(parser.parse('/blog/unknown')); // => null
 * console.log(parser.print({ tag: 'Blog', category: 'science', page: 3 })); // => "/blog/science?page=3"
 * console.log(parser.print({ tag: 'Home' })); // => ""
 * ```
 * @param O Result of `parse` (output)
 * @param I Input for `print`, usually same as `O`
 */
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


// Instance methods
export class ParserBase<O={}, I=O> {
  readonly _O: O;
  readonly _I: I;
  
  /**
   *  Try to match given string to an `O`
   */
  parse(url: string): O|null {
    const self = this as any as Parser<O, I>;
    const results = doParse(self, prepareState(url), OnlyFirstMatch);
    return results.length ? results[0][0] : null;
  }

  /** 
   * Inverse of `parse`. Convert result of parsing back into url.
   */
  print(route: I): string {
    const self = this as any as Parser<O, I>;
    return assembleChunks(doPrint(self, route));
  }

  /**
   * Similar to `parse`, but returns all intermediate routes
   * 
   * ```ts
   * const parser = r.oneOf(
   *   r.tag('Home').path('/'),
   *   r.tag('Shop').path('/shop'),
   *   r.tag('Item').path('/shop/item').segment('id', r.nestring),
   * );
   * console.log(parser.parseAll('/shop/item/42'));
   * // => [{ tag: 'Item', id: '42' }, { tag: 'Shop' }, { tag: 'Home' }]
   * ```
   */
  parseAll(url: string): O[] {
    const self = this as any as Parser<O, I>;
    const results = doParse(self, prepareState(url), 0x0).sort(compareFn);
    const output: Array<O> = [];
    let idx = -1;
    for (const [route, state] of results) {
      if (idx === state.idx) continue;
      output.push(route);
      idx = state.idx;
    }
    return output;

    function compareFn(a: [O, ParserState], b: [O, ParserState]): number {
      return b[1].idx - a[1].idx;
    }
  }

  /** 
   * Add path segments to parser
   * 
   * ```ts
   * const parser = t.tag('Contacts').path('/my/contacts/');
   * console.log(parser.print({ tag: 'Contacts' })); // => "my/contacts"
   * ```
   * @param path Path segments separated by slash, extra slashes don't
   * matter
   */
  path(path: string): Merge<O, I> {
    const self = this as any as Parser<O, I>;
    const segments = path.split('/').filter(x => !!x);
    return new Merge(self, new Path(segments));
  }
  
  /**
   * Check one path segment with adapter and store the result in the
   * given field
   * 
   * ```ts
   * const parser = r.path('/shop').segment('category', r.nestring).segment('page', r.nat);
   * console.log(parser.parse('/category/art/10')); // => { category: "art", page: 10 }
   * console.log(parser.parse('/category/art')); // => null
   * console.log(parser.print({ category: 'music', page: 1 })); // => "category/music/1"
   * ```
   * @param key Field name in the data structure
   * @param adapter Adapter for parsing content of the segment
   */
  segment<K extends string, A extends Adapter<any, { nonEmpty: true }>>(key: K, adapter: A): SegmentParser<O, I, K, A> {
    const self = this as any as Parser<O, I>;
    return new Merge(self, new Segment(key, adapter));
  }
  
  /**
   * Add query parameters
   * 
   * ```ts
   * const parser = r.path('/shop/items').params({ offset: r.nat.withDefault(0), limit: r.nat.withDefault(20), search: r.string.withDefault('') });
   * console.log(parser.parse('/shop/items')); // => { offset: 0, limit: 20, search: "" }
   * console.log(parser.print({ offset: 20, limit: 20, search: "bana" })); // => "shop/items?offset=20&search=bana"
   * ```
   * @param params Object where keys are parameter names and values
   * are adapters
   */
  params<R extends Record<string, Adapter<any>>>(params: R): ParamsParser<O, I, R> {
    const self = this as any as Parser<O, I>;
    return new Merge(self, new Params(params));
  }
  
  /**
   * Join two parsers together. Underlying types will be combined through
   * intersection. That is, the fields will be merged
   * 
   * ```ts
   * const blog = r.path('/blog').params({ page: r.nat.withDefault(1) });
   * const parser = r.tag('Blog').path('/website').concat(blog);
   * console.log(parser.parse('/website/blog')); // => { tag: "Blog", page: 1 }
   * console.log(parser.print({ tag: "Blog", page: 10 })); // => "website/blog?page=10"
   * ```
   * @param that Another `Parser`
   */
  merge<That extends Parser<any, any>>(that: That): Merge<O & That['_O'], I & That['_I']> {
    const self = this as any as Parser<O, I>;
    return new Merge(self, that);
  }
  
  /**
   * Join two parsers together. Result of the second parser will be
   * stored in the field `key`
   * 
   * ```ts
   * const blog = r.path('/blog').params({ page: r.nat.withDefault(1) });
   * const parser = r.tag('Blog').path('/website').concat(blog);
   * console.log(parser.parse('/website/blog')); // => { tag: "Blog", page: 1 }
   * console.log(parser.print({ tag: "Blog", page: 10 })); // => "website/blog?page=10"
   * ```
   * @param that Another `Parser`
   */
  embed<K extends string, That extends Parser<any, any>>(key: K, that: That): Merge<O & { [k in K]: That['_O'] }, I & { [k in K]: That['_I'] }> {
    const self = this as any as Parser<O, I>;
    return new Merge(self, new Embed(key, that));
  }
  
  /**
   * Add some extra fields to the output. These fields are not
   * required in input, i.e. in `Parser.prototype.print`. This is
   * convenient way to store related information and keep
   * configuration in one place.
   * 
   * ```ts
   * const parser = r.oneOf(
   *   r.tag('Shop').path('/shop').extra({ component: require('./Shop') }),
   *   r.tag('Blog').path('/blog').extra({ component: require('./Blog') }),
   *   r.tag('Contacts').path('/contacts').extra({ component: require('./Contacts') }),
   * );
   * console.log(parser.parse('/contacts')); // => { tag: "Contacts", component: Shop { ... } }
   * console.log(parser.print({ tag: "Contacts" })); // => "contacts"
   * ```
   * @param payload Object that will be merged with output
   */
  extra<E extends {}>(payload: E): Merge<O & E, I> {
    const self = this as any as Parser<O, I>;
    return new Merge(self, new Extra(payload));
  }

  /** Add additional fields to `I` */
  toOutput(input: I): O {
    const self = this as any as Parser<O, I>;
    return toOutput(self, input);
  }
}

/** Provide parser with a unique key in order to use it in `oneOf` */
export function tag<T extends string>(tag: T): Parser<{ tag: T }, { tag: T }> {
  return new Extra({ tag });
}


/** @see `Parser.prototype.path` */
export function path(segmentsStr: string): Parser<{}, {}> {
  const segments = segmentsStr.split('/').filter(x => !!x);
  return new Path(segments);
}


/** @see `Parser.prototype.segment` */
export function segment<K extends string, A extends Adapter<any>>(key: K, adapter: A): SegmentParser<{}, {}, K, A> {
  return new Segment(key, adapter);
}


/** @see `Parser.prototype.extra` */
export function extra<E extends {}>(payload: E): Extra<E, {}> {
  return new Extra(payload);
}


/** @see `Parser.prototype.params` */
export function params<R extends Record<string, Adapter<any>>>(params: R): ParamsParser<{}, {}, R> {
  return new Params(params);
}


export function embed<K extends string, That extends Parser<any, any>>(key: K, that: That): Parser<{ [k in K]: That['_O'] }, { [k in K]: That['_I'] }> {
  return new Embed(key, that);
}


/**
 * Construct a custom parser
 */
export function custom<O, I=O>(parse: (s: ParserState) => Array<[O, ParserState]>, print: (a: I) => UrlChunks): Custom<O, I> {
  return new Custom(parse, print);
}


// Shorthand for result of `oneOf`
export type OneOfParser<P extends WithTag> = OneOf<P['_O'], P['_I']>;
export type WithTag = Parser<{ tag: string }, { tag: string }>;


/**
 * Combine multiple alternative parsers. All parsers should be
 * provided with a `tag`
 * 
 * ```ts
 * const parser = r.oneOf([
 *   r.tag('First').path('/first'),
 *   r.tag('Second').path('/second'),
 *   r.tag('Third').path('/third'),
 * ]);
 * console.log(parser.parse('/first')); // => { tag: "First" }
 * console.log(parser.parse('/second')); // => { tag: "Second" }
 * console.log(parser.print({ tag: 'Third' })); // => "third"
 * ```
 */
export function oneOf<P extends WithTag[]>(...args: P): OneOfParser<P[number]>;
export function oneOf<P extends WithTag[]>(array: P): OneOfParser<P[number]>;
export function oneOf(): OneOfParser<any> {
  const parsers: ArrayLike<WithTag> = Array.isArray(arguments[0]) ? arguments[0] : arguments;
  const tags: Record<string, Parser> = {};
  for (let i = 0; i < parsers.length; i++) {
    const tag = lookupTag(parsers[i]);
    if (tag !== null) tags[tag] = prepareOneOf(parsers[i]);
    else throw new Error(`oneOf: argument #${i + 1} wasn't provided with a tag`);
  }

  const prefixTrie = buildTrie(tags);
  return new OneOf(tags, prefixTrie);

  function lookupTag(parser: WithTag): string|null {
    for (const rule of Array.from(makeIterator(parser))) {
      if (rule instanceof Extra && typeof(rule._payload['tag']) === 'string') return rule._payload['tag'];
    }
    return null;
  }
}


// Construct state from relative url
export function prepareState(url: string): ParserState {
  const [path, query] = url.split('?');
  const segments = path.split('/').filter(x => x !== '').map(decodeURIComponent);
  const params = (query || '').split('&').filter(x => x !== '').reduce<Record<string, string>>((acc, pair) => { 
    const [key, value] = pair.split('=').map(decodeURIComponent);
    acc[key] = value || '';
    return acc;
  }, {}); // tslint:disable-line:align
  return new ParserState(segments, params, 0);
}


// Construct url from the result of `Parser.print`
export function assembleChunks(chunks: UrlChunks): string {
  const [segments, params] = chunks;
  const query = Object.keys(params).map(key => {
    const [k, v] = [prettyUriEncode(key), prettyUriEncode(params[key])];
    return k + (v ? '=' + v : '');
  }).join('&');
  return segments.map(prettyUriEncode).join('/') + (query ? '?' + query : '');
}


// Make an instance of `O` from `I`
export function toOutput<O, I>(parser: Parser<O, I>, input: I): O {
  if (parser instanceof Params) {
    // @ts-ignore
    const output = { ...input } as O;
    for (const k in parser._params) {
      if (!(k in output)) {
        const maybeDefault = getDefaultValue(parser._params[k]);
        if (maybeDefault.isSome()) output[k] = maybeDefault.value;
      }
    }
    return output;
  }
  
  if (parser instanceof Segment) {
    // @ts-ignore
    return parser._key in input ? input as O : { ...input, [parser._key]: getDefaultValue(parser._adapter) } as O;
  }
  
  if (parser instanceof Path) {
    return input as any as O; // O ~ {}
  }

  if (parser instanceof Embed) {
    // @ts-ignore
    return { ...input, [parser._key]: toOutput(parser._parser, input[parser._key]) } as O;
  }

  if (parser instanceof OneOf) {
    return toOutput(parser._tags[input['tag']], input) as O;
  }

  if (parser instanceof Extra) {
    // @ts-ignore
    return { ...input, ...parser._payload } as O;
  }

  if (parser instanceof Custom) {
    console.error(`'toOutput' cannot be used with 'Custom' parsers`);
    return input as any as O;
  }

  if (parser instanceof Merge) {
    return { ...toOutput(parser._first, input), ...toOutput(parser._second, input) } as O;
  }

  return absurd(parser);
}


// Parsers that can produce only one output
export type SingleParser<O={}, I=O> =
  | Params<O, I>
  | Segment<O, I>
  | Path<O, I>
  | Extra<O, I>


// Parsers that can produce many outputs
export type MultipleParser<O={}, I=O> =
  | Embed<O, I>
  | OneOf<O, I>
  | Custom<O, I>
  | Merge<O, I>
  ;


// Do actual parsing
export function doParse<O>(parser: Parser<O, any>, state: ParserState, options = AllSegmentsConsumed): Array<[O, ParserState]> {
  const results: any[] = [[{}, state.clone()]];

  for (const p of Array.from(makeIterator(parser))) {
    if (p instanceof Params || p instanceof Segment || p instanceof Path || p instanceof Extra) {
      let i = 0;
      while (i < results.length) {
        if (!parseSingle(p, results[i][0], results[i][1])) {
          results.splice(i, 1);
        } else i++;
      }
      if (results.length === 0) return results;
    } else {
      let i = 0;
      while (i < results.length) {
        const replacements = parseMultiple(p, results[i][0], results[i][1]);
        results.splice(i, 1, ...replacements);
        i += replacements.length;
      } 
      if (results.length === 0) return results;
    }
  }
  
  return results;

  // Handle parsers that produce only one result
  function parseSingle<O>(parser: SingleParser<O, any>, output: O, state: ParserState): boolean {
    const { segments, params, idx } = state;
    if (parser instanceof Params) {
      for (const key in parser._params) {
        if (!parser._params.hasOwnProperty(key)) continue;
        const item = parser._params[key] as Adapter<any>;
        const name = getName(item);
        const defaultValue = getDefaultValue(item);
        const paramKey = name instanceof Some ? name.value : key;
        const maybeValue = item.applyOption(params.hasOwnProperty(paramKey) ? some(params[paramKey]) : none).or(
          defaultValue instanceof Some ? defaultValue : none
        );
        if (maybeValue instanceof None) return false;
        output[key] = maybeValue.value;
      }
      return true;
    }
    
    if (parser instanceof Segment) {
      if (idx === segments.length) return false;
      const segment = segments[idx];
      const result = parser._adapter.apply(segment);
      if (result instanceof None) return false;
      output[parser._key] = result.value;
      state.idx++;
      return true;
    }
    
    if (parser instanceof Path) {
      let mathes = true;
      for (let i = 0; i < parser._segments.length; i++) if (segments[idx + i] !== parser._segments[i]) { mathes = false; break; }
      if (!mathes) return false;
      state.idx += parser._segments.length;
      return true;
    }
    
    if (parser instanceof Extra) {
      Object.assign(output, parser._payload);
      return true;
    }

    return absurd(parser);
  }

  // Handle rules that can produce multiple results
  function parseMultiple<O>(parser: MultipleParser<O, any>, prevOutput: O, prevState: ParserState): Array<[O, ParserState]> {
    if (parser instanceof OneOf) {
      const output: any[] = [];
      const trie: PrefixTrie = parser._prefixTrie || { '': Object.keys(parser._tags).map(k => parser._tags[k]) };
      let iter: PrefixTrie = trie;
      let idx = prevState.idx;
      const parents: PrefixTrie[] = [];
      const segments = prevState.segments;
      do {
        parents.push(iter);
        const nextSegment = segments[idx++];
        if (!iter.hasOwnProperty(nextSegment)) break;
        iter = iter[nextSegment] as PrefixTrie;
      } while (1);
      for (let i = parents.length - 1; i >= 0; i--) {
        for (const rules of parents[i]['']) {
          for (const pair of doParse(rules, prevState, options)) {
            const [route, state] = pair;
            Object.assign(route, prevOutput);
            if (!(options & OnlyFirstMatch)) output.push(pair);
            if ((options & OnlyFirstMatch) && state.idx === state.segments.length) return [pair] as any;
          }
        }
      }
      return output;
    }
    
    if (parser instanceof Custom) {
      const output = parser._parse(prevState);
      for (const pair of output) {
        const [route, state] = pair;
        Object.assign(route, prevOutput);
        if ((options & OnlyFirstMatch) && state.idx === state.segments.length) return [pair] as any;
      }
      return (options & OnlyFirstMatch) ? [] : output as any;
    }

    if (parser instanceof Embed) {
      const output = doParse(parser._parser, prevState, options);
      for (const i in output) {
        output[i][0] = Object.assign({ [parser._key]: output[i][0] }, prevOutput);
      }
      return output as any;
    }

    if (parser instanceof Merge) {
      // Unreachable code because `makeIterator` never yields `Merge`
      return [];
    }

    return absurd(parser);
  }
}


// Do printing
export function doPrint<I>(parser: Parser<any, I>, route: I): UrlChunks {
  const output: UrlChunks = [[], {}];
  printHelper(parser, route, output);
  return output;
  
  function printHelper(parser: Parser, route: I, output: UrlChunks) {
    const [segments, params] = output;
    if (parser instanceof Params) {
      for (const key in parser._params) { 
        if (!parser._params.hasOwnProperty(key)) continue;
        const adapter = parser._params[key] as Adapter<any>;
        const defaultValue = getDefaultValue(adapter);
        if (defaultValue instanceof Some && (!(key in route) || isEqual(route[key], defaultValue.value))) continue;
        const name = getName(adapter);
        const paramKey = name instanceof Some ? name.value : key;
        const maybeValue = adapter.unapplyOption(route[key]);
        if (maybeValue.isSome()) params[paramKey] = maybeValue.value;
      }
      return void 0;
    }
    
    if (parser instanceof Segment) {
      const defaultValue = getDefaultValue(parser._adapter);
      const value = parser._key in route ? route[parser._key] : defaultValue instanceof Some ? defaultValue.value : undefined;
      segments.push(parser._adapter.unapply(value));
      return void 0;
    }
    
    if (parser instanceof Path) {
      parser._segments.forEach(x => segments.push(x));
      return void 0;
    }
    
    if (parser instanceof OneOf) {
      printHelper(parser._tags[route['tag']], route, output);
      return void 0;
    }
    
    if (parser instanceof Extra) {
      return void 0;
    }

    if (parser instanceof Custom) {
      for (const chunks of parser._print(route)) {
        chunks[0].forEach(x => segments.push(x));
        Object.assign(params, chunks[1]);
      }
      return void 0;
    }

    if (parser instanceof Embed) {
      printHelper(parser._parser, route[parser._key], output);
      return void 0;
    }

    if (parser instanceof Merge) {
      printHelper(parser._first, route, output);
      printHelper(parser._second, route, output);
      return void 0;
    }

    return absurd(parser);
  }  
}


/** Options for `doParse` */
export enum ParseOptions {
  OnlyFirstMatch = 0x1 << 0,
  AllSegmentsConsumed = 0x1 << 1,
}
const { OnlyFirstMatch, AllSegmentsConsumed } = ParseOptions;


/**
 * Deconstructed url. The first element of the tuple is the list of
 * path segments and the second is query string dictionary. This type
 * is used as the result type of `doPrint`
 */
export type UrlChunks = [string[], Record<string, string>];


/**
 * Search optimization structure for `oneOf`
 * @see https://en.wikipedia.org/wiki/Trie
 */
export interface PrefixTrie {
  '': Parser[];
  [k: string]: Parser[]|PrefixTrie; // should be `PrefixTrie`, but ts complains
}


// Internal parser state
export class ParserState {
  constructor(
    public segments: string[],
    public params: Record<string, string>,
    public idx: number,
  ) {}

  clone() {
    return new ParserState(this.segments, this.params, this.idx);
  }
}


// -- helpers --


// Result type for `Parser.prototype.segment`
export type SegmentParser<O, I, K extends string, A extends Adapter<any>>
  = Parser<O & { [K_ in K]: A['_A'] }, I & InParams<{ [K_ in K]: A }>>;


// Result type for `Parser.prototype.params`
export type ParamsParser<O, I, R extends Record<string, Adapter<any>>>
  = Parser<O & OutParams<R>, I & InParams<R>>;


export type InParams<R extends Record<string, Adapter<any, any>>> = {
  [K in keyof R]: R[K] extends Adapter<infer A, { hasDefault }> ? { [K_ in K]?: A } : R[K] extends Adapter<infer A, any> ? { [K_ in K]: A } : never;
}[keyof R];


export type OutParams<R> = {
  [K in keyof R]: R[K] extends Adapter<infer A, any> ? A : never;
}


// Build optimization structure for `oneOf`
function buildTrie<O, I>(tags: Record<string, Parser<O, I>>): PrefixTrie {
  const trie: PrefixTrie = { '': [] };
  for (const k in tags) {
    let iter: PrefixTrie = trie;
    for (const parser of Array.from(makeIterator(tags[k]))) {
      if (!(parser instanceof Path)) break;
      for (const s of parser._segments) { iter[s] = iter[s] || { '': [] }; iter = iter[s] as PrefixTrie; }
    }
    iter[''].push(tags[k]);
  }
  return trie;
}


// Custom uri encoding
const prettyUriEncode: (str: string) => string = function () {
  const keepIntact = [':', ','].reduce((acc, c) => (acc[encodeURIComponent(c)] = c, acc), {});
  const re = new RegExp(Object.keys(keepIntact).map(escapeRegExp).join('|'), 'g');
  return str => encodeURIComponent(str).replace(re, sub => keepIntact[sub]);
}();


// https://stackoverflow.com/a/9310752
function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}


// All parsers except `Merge`
export type PrimitiveParser<O={}, I=O> = OmitMerge<Parser<O, I>>;
export type OmitMerge<T> = T extends Merge<any, any> ? never : T;


// Traverse all primitive parsers
export function traverseParsers<O, I>(parser: Parser<O, I>, iteratee: (parser: PrimitiveParser<unknown>) => void): void {
  if (parser instanceof Merge) {
    traverseParsers(parser._first, iteratee);
    traverseParsers(parser._second, iteratee);
  } else {
    iteratee(parser);
  }
}


function getDefaultValue<A>(adapter: Adapter<A>): Option<A> {
  if (adapter instanceof DefaultAdapter) return some(adapter._default);
  if (adapter instanceof CustomAdapter) return none;
  if (adapter instanceof NamedAdapter) return getDefaultValue(adapter._adapter);
  if (adapter instanceof DimapAdapter) return getDefaultValue(adapter._adapter).map(adapter._map);
  if (adapter instanceof HasAdapter) return getDefaultValue(adapter.toAdapter());
  return absurd(adapter);
}

function getName<A>(adapter: Adapter<A>): Option<string> {
  if (adapter instanceof DefaultAdapter) return getName(adapter._adapter);
  if (adapter instanceof CustomAdapter) return none;
  if (adapter instanceof NamedAdapter) return some(adapter._name);
  if (adapter instanceof DimapAdapter) return getName(adapter._adapter);
  if (adapter instanceof HasAdapter) return getName(adapter.toAdapter());
  return absurd(adapter);
}


export class Params<O, I=O> extends ParserBase<O, I> {
  constructor(
    readonly _params: Record<string, Adapter<any>>,
  ){ super(); }
}


export class Segment<O, I=O> extends ParserBase<O, I> {
  constructor(
    readonly _key: string,
    readonly _adapter: Adapter<any>,
  ){ super(); }
}


export class Path<O, I=O> extends ParserBase<O, I> {
  constructor(
    readonly _segments: string[]
  ){ super(); }
}


export class Embed<O, I=O> extends ParserBase<O, I> {
  constructor(
    readonly _key: string,
    readonly _parser: Parser<any>,
  ){ super(); }
}


export class Merge<O, I=O> extends ParserBase<O, I> {
  constructor(
    readonly _first: Parser<any>,
    readonly _second: Parser<any>,
  ){ super(); }
}


export class OneOf<O, I=O> extends ParserBase<O, I> {
  constructor(
    readonly _tags: Record<string, Parser<any>>,
    readonly _prefixTrie?: PrefixTrie,
  ){ super(); }
}


export class Extra<O, I=O> extends ParserBase<O, I> {
  constructor(
    readonly _payload: object,
  ){ super(); }
}


export class Custom<O, I=O> extends ParserBase<O, I> {
  constructor(
    readonly _parse: (s: ParserState) => Array<[O, ParserState]>,
    readonly _print: (a: I) => UrlChunks,
  ){ super(); }
}
