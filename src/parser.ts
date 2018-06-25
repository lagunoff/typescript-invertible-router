import { some, none } from './option';
import { Adapter } from './adapter';
import isEqual from './internal/isequal';


// Invertible url parser library
// http://www.informatik.uni-marburg.de/~rendel/unparse/rendel10invertible.pdf
// https://github.com/evancz/url-parser/tree/2.0.1

/** Options for `doParse` */
export enum ParseOptions {
  OnlyFirstMatch = 0x1 << 0,
  AllSegmentsConsumed = 0x1 << 1,
}
const { OnlyFirstMatch, AllSegmentsConsumed } = ParseOptions;


/**
 * `Parser` defines mutual correspondence between strings (relative
 * urls) (e.g. "/" "/shop" "/blog?tags=art") and some intermediate
 * data structure, usually named `Route`. Parser maybe is a misleading
 * name, because besides parsing it also does the opposite operation,
 * printing.
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
 * @param O Result of parsing (output)
 * @param I Input for printing, usually same as `O`
 * @param Extra Extra fields in `O` not required to be present in `I`
 */
export class Parser<O, I=O, Extra={}> {
  readonly _O: O;
  readonly _I: I;
  readonly _Extra: Extra; // tslint:disable-line:variable-name

  constructor(
    readonly rules: ParserMethod<O, I, Extra>[],
  ) {}

  /** Try to match given string against the rules */
  parse(url: string): O|null {
    const results = doParse(this.rules, prepareState(url), OnlyFirstMatch);
    return results.length ? results[0][0] : null;
  }

  /** Convert result of parsing back into url. Inverse of `parse` */
  print(route: I): string {
    return assembleChunks(doPrint(this.rules, route));
  }

  /**
   * Similar to `parse`, but returns an array of routes that includes
   * all intermediate results that would succeed if input didn't have
   * some redundant path segments.
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
    const results = doParse(this.rules, prepareState(url), 0x0).sort(compareFn);
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
  path(path: string): Parser<O, I, Extra> {
    const segments = path.split('/').filter(x => x !== '');
    this.rules.push({ tag: 'Path', segments });
    return this as any;
  }
  
  /**
   * Parse one path segment with adapter and assign the result to the
   * field with the given key
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
  segment<K extends string, A extends Adapter<any, { hasTotal: true }>>(key: K, adapter: A): SegmentParser<O, I, Extra, K, A> {
    this.rules.push({ tag: 'Segment', key, adapter });
    return this as any;
  }
  
  /**
   * Add query string parameters
   * 
   * ```ts
   * const parser = r.path('/shop/items').params({ offset: r.nat.withDefault(0), limit: r.nat.withDefault(20), search: r.string.withDefault('') });
   * console.log(parser.parse('/shop/items')); // => { offset: 0, limit: 20, search: "" }
   * console.log(parser.print({ offset: 20, limit: 20, search: "bana" })); // => "shop/items?offset=20&search=bana"
   * ```
   * @param params Object where keys are parameter names and values
   * are adapters
   */
  params<R extends Record<string, Adapter<any, { hasPartial: true }>>>(params: R): ParamsParser<O, I, Extra, R> {
    this.rules.push({ tag: 'Params', params });
    return this as any;
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
  concat<That extends Parser<any, any, any>>(that: That): Parser<O & That['_O'], I & That['_I'], Extra & That['_Extra']> {
    that.rules.forEach(x => this.rules.push(x));
    return this as any;
  }
  
  /**
   * Join two parsers together. Result of the second will be stored in
   * the field `key`
   * 
   * ```ts
   * const blog = r.path('/blog').params({ page: r.nat.withDefault(1) });
   * const parser = r.tag('Blog').path('/website').concat(blog);
   * console.log(parser.parse('/website/blog')); // => { tag: "Blog", page: 1 }
   * console.log(parser.print({ tag: "Blog", page: 10 })); // => "website/blog?page=10"
   * ```
   * @param that Another `Parser`
   */
  embed<K extends string, That extends Parser<any, any, any>>(key: K, that: That): Parser<O & { [k in K]: That['_O'] }, I & { [k in K]: That['_I'] }, Extra> {
    this.rules.push({ tag: 'Embed', key, rules: that.rules.slice() });
    return this as any;
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
  extra<E>(payload: E): Parser<O & E, I, Extra & E> {
    this.rules.push({ tag: 'Extra', payload } as any);
    return this as any;
  }

  /** Create a copy of `Parser` */
  clone(): Parser<O, I, Extra> {
    return new Parser(this.rules.slice());
  }
}


/** Provide parser with a unique key in order to use it in `oneOf` */
export function tag<T extends string>(tag: T): Parser<{ tag: T }, { tag: T }, { tag: T }> {
  return new Parser([{ tag: 'Extra', payload: { tag } }]);
}


/** @see `Parser.prototype.path` */
export function path(segmentsStr: string): Parser<{}, {}, {}> {
  const segments = segmentsStr.split('/').filter(x => x !== '');
  return new Parser([{ tag: 'Path', segments }]);
}


/** @see `Parser.prototype.segment` */
export function segment<K extends string, A extends Adapter<any, { hasTotal: true }>>(key: K, adapter: A): SegmentParser<{}, {}, {}, K, A> {
  return new Parser([{ tag: 'Segment', key, adapter }]);
}


/** @see `Parser.prototype.extra` */
export function extra<E>(payload: E): Parser<E, {}, E> {
  return new Parser([{ tag: 'Extra', payload }]);
}


/** @see `Parser.prototype.params` */
export function params<R extends Record<string, Adapter<any, { hasPartial: true }>>>(params: R): ParamsParser<{}, {}, {}, R> {
  return new Parser([{ tag: 'Params', params }]);
}


/**
 * Implement custom parser
 */
export function custom<O, I=O>(parse: (s: ParserState) => Array<[O, ParserState]>, print: (a: I) => UrlChunks): Parser<O, I, {}> {
  return new Parser([{ tag: 'Custom', parse, print }]);
}


// Shorthand for result of `oneOf`
export type OneOfParser<P extends T> = Parser<P['_O'], P['_I'], {}>;
export type T = Parser<any, any, { tag: string }>;


/**
 * Combine multiple alternative parsers. All parsers should be
 * constructed with `tag`
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
export function oneOf<P1 extends T>(a: P1): OneOfParser<P1>;
export function oneOf<P1 extends T, P2 extends T>(a: P1, b: P2): OneOfParser<P1|P2>;
export function oneOf<P1 extends T, P2 extends T, P3 extends T>(a: P1, b: P2, c: P3): OneOfParser<P1|P2|P3>;
export function oneOf<P1 extends T, P2 extends T, P3 extends T, P4 extends T>(a: P1, b: P2, c: P3, d: P4): OneOfParser<P1|P2|P3|P4>;
export function oneOf<P1 extends T, P2 extends T, P3 extends T, P4 extends T, P5 extends T>(a: P1, b: P2, c: P3, d: P4, e: P5): OneOfParser<P1|P2|P3|P4|P5>;
export function oneOf<P1 extends T, P2 extends T, P3 extends T, P4 extends T, P5 extends T, P6 extends T>(a: P1, b: P2, c: P3, d: P4, e: P5, f: P6): OneOfParser<P1|P2|P3|P4|P5|P6>;
export function oneOf<P1 extends T, P2 extends T, P3 extends T, P4 extends T, P5 extends T, P6 extends T, P7 extends T>(a: P1, b: P2, c: P3, d: P4, e: P5, f: P6, g: P7): OneOfParser<P1|P2|P3|P4|P5|P6|P7>;
export function oneOf<P1 extends T, P2 extends T, P3 extends T, P4 extends T, P5 extends T, P6 extends T, P7 extends T, P8 extends T>(a: P1, b: P2, c: P3, d: P4, e: P5, f: P6, g: P7, h: P8): OneOfParser<P1|P2|P3|P4|P5|P6|P7|P8>;
export function oneOf<P1 extends T, P2 extends T, P3 extends T, P4 extends T, P5 extends T, P6 extends T, P7 extends T, P8 extends T, P9 extends T>(a: P1, b: P2, c: P3, d: P4, e: P5, f: P6, g: P7, h: P8, i: P9): OneOfParser<P1|P2|P3|P4|P5|P6|P7|P8|P9>;
export function oneOf<array extends T[]>(array: array): OneOfParser<array[number]>;
export function oneOf(): OneOfParser<any> {
  const parsers: ArrayLike<T> = Array.isArray(arguments[0]) ? arguments[0] : arguments;
  const tags: Record<string, ParserMethod[]> = {};
  for (let i = 0; i < parsers.length; i++) {
    const tag = lookupTag(parsers[i]);
    if (tag) tags[tag] = parsers[i].rules.slice().sort(compareFn);
    else throw new Error(`oneOf: argument #${i + 1} wasn't provided with a tag`);
  }

  const prefixTrie = buildTrie(tags);
  return new Parser([{ tag: 'OneOf', tags, prefixTrie }]);

  function lookupTag(parser: T): string|null {
    for (const rule of parser.rules) {
      if (rule.tag === 'Extra' && typeof(rule.payload['tag']) === 'string') return rule.payload['tag'];
    }
    return null;
  }

  function compareFn(a: ParserMethod, b: ParserMethod): number {
    const aWeight = a.tag === 'Path' || a.tag === 'Segment' ? -1 : 0;
    const bWeight = b.tag === 'Path' || b.tag === 'Segment' ? -1 : 0;
    return aWeight - bWeight;
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


// Do actual parsing
export function doParse<O>(rules: ParserMethod<O, any>[], state: ParserState, options = AllSegmentsConsumed): Array<[O, ParserState]> {
  if (rules.length === 0) return [];
  const results: any[] = [[{}, state.clone()]];
  
  for (const method of rules) {
    if (method.tag === 'Params' || method.tag === 'Segment' || method.tag === 'Path' || method.tag === 'Extra') {
      let i = 0;
      while (i < results.length) {
        if (!parseSingle(method, results[i][0], results[i][1])) {
          results.splice(i, 1);
        } else i++;
      }
      if (results.length === 0) return results;
    } else {
      let i = 0;
      while (i < results.length) {
        const replacements = parseMultiple(method, results[i][0], results[i][1]);
        results.splice(i, 1, ...replacements);
        i += replacements.length;
      } 
      if (results.length === 0) return results;      
    }
  }
  
  return results;

  // Handle rules that produce only one result
  function parseSingle<O>(rule: ParserMethod, output: O, state: ParserState): boolean {
    const { segments, params, idx } = state;
    switch (rule.tag) {
      case 'Params': {
        for (const key in rule.params) {
          if (!rule.params.hasOwnProperty(key)) continue;
          const item = rule.params[key];
          const namedAdapter = item.getImpl('hasName');
          const defaultAdapter = item.getImpl('hasDefault');
          const paramKey = namedAdapter ? namedAdapter._name : key;
          const maybeValue = item.getImpl('hasPartial')._applyPartial(params.hasOwnProperty(paramKey) ? some(params[paramKey]) : none).or(
            defaultAdapter ? some(defaultAdapter._default) : none
          );
          if (maybeValue.tag === 'None') return false;
          output[key] = maybeValue.value;
        }
        return true;
      }
      case 'Segment': {
        if (idx === segments.length) return false;
        const segment = segments[idx];
        const result = rule.adapter.getImpl('hasTotal')._applyTotal(segment);
        if (result.tag === 'None') return false;
        output[rule.key] = result.value;
        state.idx++;
        return true;
      }
      case 'Path': {
        let mathes = true;
        for (let i = 0; i < rule.segments.length; i++) if (segments[idx + i] !== rule.segments[i]) { mathes = false; break; }
        if (!mathes) return false;
        state.idx += rule.segments.length;
        return true;
      }
      case 'Extra': {
        Object.assign(output, rule.payload);
        return true;
      }
    }
    // unreachable code
    return false; 
  }

  // Handle rules that can produce multiple results
  function parseMultiple<O>(rule: ParserMethod, prevOutput: O, prevState: ParserState): Array<[O, ParserState]> {
    switch (rule.tag) {
      case 'OneOf': {
        const output: any[] = [];
        const trie: PrefixTrie = rule.prefixTrie || { '': Object.keys(rule.tags).map(k => rule.tags[k]) };
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
      case 'Custom': {
        const output = rule.parse(prevState);
        for (const pair of output) {
          const [route, state] = pair;
          Object.assign(route, prevOutput);
          if ((options & OnlyFirstMatch) && state.idx === state.segments.length) return [pair] as any;
        }
        return (options & OnlyFirstMatch) ? [] : output as any;
      }
      case 'Embed': {
        const output = doParse(rule.rules, prevState, options);
        for (const i in output) {
          output[i][0] = Object.assign({ [rule.key]: output[i][0] }, prevOutput);
        }
        return output as any;
      }
    }
    // unreachable code
    return [];     
  }
}


// Do printing
export function doPrint<I>(rules: ParserMethod<any, I, any>[], route: I): UrlChunks {
  const output: UrlChunks = [[], {}];
  for (const rule of rules) printHelper(rule, route, output);
  return output;
  
  function printHelper(rule: ParserMethod, route: I, output: UrlChunks) {
    const [segments, params] = output;
    switch (rule.tag) {
      case 'Params': {
        for (const key in rule.params) { 
          if (!rule.params.hasOwnProperty(key)) continue;
          const adapter = rule.params[key];
          const defaultAdapter = adapter.getImpl('hasDefault');
          if (defaultAdapter && (!(key in route) || isEqual(route[key], defaultAdapter._default))) continue;
          const namedAdapter = adapter.getImpl('hasName');
          const paramKey = namedAdapter ? namedAdapter._name : key;
          const maybeValue = adapter.getImpl('hasPartial')._unapplyPartial(route[key]);
          if (maybeValue.tag === 'Some') params[paramKey] = maybeValue.value;
        }
        return void 0;
      }
      case 'Segment': {
        const value = rule.key in route ? route[rule.key] : rule.adapter.getImpl('hasDefault')!._default;
        segments.push(rule.adapter.getImpl('hasTotal')._unapplyTotal(value));
        return void 0;
      }
      case 'Path': {
        rule.segments.forEach(x => segments.push(x));
        return void 0;
      }
      case 'OneOf': {
        for (const nestedRules of rule.tags[route['tag']]) {
          printHelper(nestedRules, route, output);
        }
        return void 0;
      }
      case 'Extra': {
        return void 0;
      }
      case 'Custom': {
        for (const chunks of rule.print(route)) {
          chunks[0].forEach(x => segments.push(x));
          Object.assign(params, chunks[1]);
        }
        return void 0;
      }
      case 'Embed': {
        for (const nestedRules of rule.rules) {
          printHelper(nestedRules, route[rule.key], output);
        }
        return void 0;
      }
    }
  }  
}


/** Internal parser state */
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


/**
 * Deconstructed url. The first element of the tuple is the list of
 * path segments and the second is query string dictionary. This type
 * is used as the result type of `doPrint`
 */
export type UrlChunks = [string[], Record<string, string>];


/**
 * Serialised representation of methods of `Parser`. Instances of
 * class `Parser` contain information about how they were
 * constructed. Later this information is used in `doParse` and
 * `doPrint`.
 */
export type ParserMethod<O={}, I=O, Extra={}> =
  | { tag: 'Params', params: Record<string, Adapter<any, { hasPartial: true }>> }
  | { tag: 'Segment', key: string, adapter: Adapter<any, { hasTotal: true }> }
  | { tag: 'Path', segments: string[] }
  | { tag: 'Embed', key: string, rules: ParserMethod[] }
  | { tag: 'OneOf', tags: Record<string, ParserMethod[]>, prefixTrie?: PrefixTrie }
  | { tag: 'Extra', payload: Extra }
  | { tag: 'Custom', parse(s: ParserState): Array<[O, ParserState]>, print(a: I): UrlChunks };


/**
 * Search optimization structure for `oneOf`
 * @see https://en.wikipedia.org/wiki/Trie
 */
export interface PrefixTrie {
  '': ParserMethod[][];
  [k: string]: ParserMethod[][]|PrefixTrie; // this should be just `PrefixTrie`, but ts complains
}


// -- helpers --


// Result type for `Parser.prototype.segment`
export type SegmentParser<O, I, Extra, K extends string, A extends Adapter<any, { hasTotal }>>
  = Parser<O & { [K_ in K]: A['_A'] }, I & InParams<{ [K_ in K]: A['_A'] }>, Extra>;


// Result type for `Parser.prototype.params`
export type ParamsParser<O, I, Extra, R extends Record<string, Adapter<any, { hasPartial: true }>>>
  = Parser<O & OutParams<R>, I & InParams<R>, Extra>;


export type InParams<R extends Record<string, Adapter<any, any>>> = {
  [K in Exclude<keyof R, PickDefault<R>>]: R[K] extends Adapter<infer A, any> ? A : never;
} & {
  [K in PickDefault<R>]?: R[K] extends Adapter<infer A, any> ? A : never;
};


export type OutParams<R extends Record<string, Adapter<any, any>>> = {
  [K in keyof R]: R[K] extends Adapter<infer A, any> ? A : never;
}

export type PickDefault<R extends Record<string, Adapter<any, any>>> = {
  [K in keyof R]: R[K] extends Adapter<infer A, { hasDefault: true }> ? K : never
}[keyof R];

    

function buildTrie(tags: Record<string, ParserMethod[]>): PrefixTrie {
  const trie: PrefixTrie = { '': [] };
  for (const k in tags) {
    let iter: PrefixTrie = trie;
    for (let j = 0; j < tags[k].length; j++) {
      const rule = tags[k][j];
      if (rule.tag !== 'Path') break;
      for (const s of rule.segments) { iter[s] = iter[s] || { '': [] }; iter = iter[s] as PrefixTrie; }
    }
    iter[''].push(tags[k]);
  }
  return trie;
}


// custom uri encoding
const prettyUriEncode: (str: string) => string = function () {
  const keepIntact = [':', ','].reduce((acc, c) => (acc[encodeURIComponent(c)] = c, acc), {});
  const re = new RegExp(Object.keys(keepIntact).map(escapeRegExp).join('|'), 'g');
  return str => encodeURIComponent(str).replace(re, sub => keepIntact[sub]);
}();


// https://stackoverflow.com/a/9310752
function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
