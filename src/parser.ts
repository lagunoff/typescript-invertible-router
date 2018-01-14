import isEqual from './internal/isequal';
import { Expr } from './internal/expr';
import * as adapter from './adapter';
import { Option, some, none, traverse } from './option'
import { Adapter, PartialAdapter, TotalAdapter, NamedAdapter, HasTotalAdapter, HasPartialAdapter } from './adapter';


/// Invertible url parser library
/// http://www.informatik.uni-marburg.de/~rendel/unparse/rendel10invertible.pdf
/// https://github.com/evancz/url-parser/tree/2.0.1


/// Parser state
export interface ParserState {
  unvisited: string[];
  visited: string[];
  params: Record<string, string>;
}


/// Url chunks
export type UrlChunks = [string[], Record<string, string>];


/// reversible parser
export class Parser<O, I=O, Extra={}> {
  readonly _O: O;
  readonly _I: I;
  readonly _Extra: Extra;

  constructor(
    readonly chain: ParserChain[],
  ) {}

  /// parse
  parse(url: string): O|null {
    const results = this.parseState(prepareState(url));
    for (let [route, state] of results) {
      if (state.unvisited.length === 0) return route;
    }
    return null;
  }

  /// print
  print(route: I): string {
    return printChunks(this.printChunks(route));
  }

  /// parse state
  parseState(state: ParserState): Array<[O, ParserState]> {
    if (this.chain.length === 0) return [];
    const loop = (i: number, route: any, state: ParserState) => {
      const output = parseStateImpl(this.chain[i], state).map(([r, s]) => [Object.assign({}, route, r), s]);
      if (i < this.chain.length - 1) return Array.prototype.concat.apply([], output.map(([r, s]) => loop(i + 1, r, s)));
      return output;
    };
    return loop(0, {}, state);
  }

  /// print route to chunks
  printChunks(route: I): UrlChunks {
    return this.chain.map(x => printChunksImpl(x, route)).reduce((acc, [segments, params]: any) => {
      for (let segment of segments) acc[0].push(segment);
      for (let key in params) params.hasOwnProperty(key) && (acc[1][key] = params[key]);
      return acc;
    }, [[], {}]);
  }

  /// path
  path(segmentsStr: string): Parser<O,I,Extra> {
    const segments = segmentsStr.split('/').filter(x => x !== '').map(prettyUriEncode);
    return new Parser(this.chain.concat({ tag: 'Path', segments } as ParserChain));
  }
  
  /// segment
  segment<K extends string, B>(key: K, adapter: HasTotalAdapter<B>): Parser<O & { [k in K]: B }, I & { [k in K]: B }, Extra> {
    return new Parser(this.chain.concat({ tag: 'Segment', key, adapter } as ParserChain));
  }
  
  /// params
  params<Keys extends Record<string, HasPartialAdapter<any>>>(description: Keys): Parser<O & { [k in keyof Keys]: Keys[k]['_A'] }, I & { [k in keyof Keys]: Keys[k]['_A'] }, Extra> {
    return new Parser(this.chain.concat({ tag: 'Params', description } as ParserChain));
  }
  
  /// join
  join<That extends Parser<any,any,any>>(that: That): Parser<O & That['_O'], I & That['_I'], Extra & That['_Extra']> {
    return new Parser(this.chain.concat(that.chain));
  }
  
  /// embed
  embed<K extends string, That extends Parser<any,any,any>>(key: K, that: That): Parser<O & { [k in K]: That['_O'] }, I & { [k in K]: That['_I'] }, Extra> {
    return new Parser(this.chain.concat({ tag: 'Embed', key, parser: that } as ParserChain));
  }
  
  /// extra
  extra<E>(payload: E): Parser<O & E, I, Extra & E> {
    return new Parser(this.chain.concat({ tag: 'Extra', payload } as ParserChain));
  }  
}


/// ParserChain
export type ParserChain<O=any, I=O, E=any> =
  | { tag: 'Params', description: Record<string, HasPartialAdapter<any>> }
  | { tag: 'Segment', key: string, adapter: HasTotalAdapter<any> }
  | { tag: 'Path', segments: string[] }
  | { tag: 'Embed', key: string, parser: Parser<any,any,any> }
  | { tag: 'OneOf', description: Record<string, Parser<any,any,any>> }
  | { tag: 'Extra', payload: E }
  | { tag: 'Custom', parse(s: ParserState): Array<[O, ParserState]>, print(a: I): [string[], Record<string, string>] };


/// tag
export function tag<T extends string>(tag: T): Parser<{ tag: T }, { tag: T }, { tag: T }> {
  return new Parser([{ tag: 'Extra', payload: { tag } }]);
}


/// path
export function path(segmentsStr: string): Parser<{},{},{}> {
  const segments = segmentsStr.split('/').filter(x => x !== '').map(prettyUriEncode);
  return new Parser([{ tag: 'Path', segments }]);
}


/// segment
export function segment<K extends string, A>(key: K, adapter: HasTotalAdapter<A>): Parser<{ [k in K]: A },{ [k in K]: A }, {}> {
  return new Parser([{ tag: 'Segment', key, adapter }]);
}


/// extra
export function extra<E>(payload: E): Parser<E, {}, E> {
  return new Parser([{ tag: 'Extra', payload }]);
}


/// params
export function params<Keys extends Record<string, HasPartialAdapter<any>>>(description: Keys): Parser<{ [k in keyof Keys]: Keys[k]['_A'] }, { [k in keyof Keys]: Keys[k]['_A'] }, {}> {
  return new Parser([{ tag: 'Params', description }]);
}


/// custom
export function custom<O, I=O>(parse: (s: ParserState) => Array<[O, ParserState]>, print: (a: I) => [string[], Record<string, string>]): Parser<O, I, {}> {
  return new Parser([{ tag: 'Custom', parse, print }]);
}


/// combine several parsers
export type TaggedParser = Parser<any,any,{ tag: string }>;
export type T = TaggedParser;
export type OneOfParser<P extends T> = Parser<P['_O'], P['_I'], {}>
  
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
  function getTag(parser: T): string|null {
    for (let c of parser.chain) {
      if (c.tag === 'Extra' && typeof(c.payload['tag']) === 'string') return c.payload['tag'];
    }
    return null;
  }
  const parsers: ArrayLike<T> = Array.isArray(arguments[0]) ? arguments[0] : arguments;
  const description: Record<string, T> = {};
  for (let i = 0; i < parsers.length; i++) {
    const tag = getTag(parsers[i]);
    if (tag) description[tag] = parsers[i];
    else throw new Error(`oneOf: all arguments should be constructed with r.tag`);
  }
  return new Parser([{ tag: 'OneOf', description }]);
}


/// construct state from relative url
export function prepareState(url: string): ParserState {
  const [path, query] = url.split('?');
  const unvisited = path.split('/').filter(x => x !== '');
  const params = (query || '').split('&').filter(x => x !== '').reduce((acc, pair) => { 
    const [key, value] = pair.split('=').map(decodeURIComponent);
    acc[key] = value || '';
    return acc;
  }, {} as Record<string, string>)
  return { unvisited, visited: [], params: params };
}


/// construct url from the result of `Parser.print`
export function printChunks(chunks: UrlChunks): string {
  const [segments, params] = chunks;
  const query = Object.keys(params).map(key => {
    const [k, v] = [prettyUriEncode(key), prettyUriEncode(params[key])];
    return k + (v ? '=' + v : '');
  }).join('&');
  return segments.join('/') + (query ? '?' + query : '');
}


// ---------------------------------------------------------------------------
// helpers


/// custom uri encoding
const prettyUriEncode: (str: string) => string = function() {
  const keepIntact = [':', ','].reduce((acc, c) => (acc[encodeURIComponent(c)] = c, acc), {});
  const re = new RegExp(Object.keys(keepIntact).map(escapeRegExp).join('|'), 'g');
  return str => encodeURIComponent(str).replace(re, sub => keepIntact[sub]);
}();


/// https://stackoverflow.com/a/9310752
function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}


/// parse state
function parseStateImpl<O>(chain: ParserChain, state: ParserState): Array<[O, ParserState]> {
  switch(chain.tag) {
    case 'Params': {
      const output = {} as O;
      for (let key in chain.description) {
        if (!chain.description.hasOwnProperty(key)) continue;
        const item = chain.description[key];
        const adapter = item.tag === 'NamedAdapter' ? item.adapter : item;
        const paramKey = item.tag === 'NamedAdapter' ? item.name : key;
        const maybeValue = adapter.applyPartial(state.params.hasOwnProperty(paramKey) ? some(state.params[paramKey]) : none);
        if (maybeValue.tag === 'None') return [];
        output[key] = maybeValue.value;
      }
      return [[output, state]];      
    }
    case 'Segment': {
      const output = {} as O;
      if (state.unvisited.length === 0) return [];
      const segment = decodeURIComponent(state.unvisited[0]);
      const result = chain.adapter.applyTotal(segment);
      if (result.tag === 'None') return [];
      output[chain.key] = result.value;
      const unvisited = state.unvisited.slice(1);
      const visited = state.visited.concat(segment);
      return [[output, { unvisited, visited, params: state.params }]];   
    }
    case 'Path': {
      const output = {} as O;
      let mathes = true;
      for (let j in chain.segments) if (state.unvisited[j] !== chain.segments[j]) { mathes = false; break; }
      if (!mathes) return [];
      const unvisited = state.unvisited.slice(0);
      const visited = state.visited.concat(unvisited.splice(0, chain.segments.length));
      return [[output, { unvisited, visited, params: state.params }]];
    }
    case 'OneOf': {
      const output: any[] = []
      for (const key in chain.description) {
        if (!chain.description.hasOwnProperty(key)) continue;
        for (const pair of chain.description[key].parseState(state)) {
	  output.push(pair);
        }
      }
      return output;
    }
    case 'Extra': {
      return [[chain.payload as O, state]];
    }
    case 'Custom': {
      return chain.parse(state);
    }
    case 'Embed': {
      return chain.parser.parseState(state).map(([r, s]) => [{ [chain.key]: r }, s] as any);
    }
  }
}


/// print chunks
function printChunksImpl<I>(chain: ParserChain, route: I): UrlChunks {
  switch(chain.tag) {
    case 'Params': {
      const params = {} as any;
      for (let key in chain.description) { 
        if (!chain.description.hasOwnProperty(key)) continue;
        const item = chain.description[key];
        const adapter = item.tag === 'NamedAdapter' ? item.adapter : item;
        const paramKey = item.tag === 'NamedAdapter' ? item.name : key;
        const maybeValue = adapter.unapplyPartial(route[key]);
        if (maybeValue.tag === 'Some') params[paramKey] = maybeValue.value;
      }
      return [[], params];
    }
    case 'Segment': {
      const segment = chain.adapter.unapplyTotal(route[chain.key]);
      return [[prettyUriEncode(segment)], {}];
    }
    case 'Path': {
      return [chain.segments, {}];
    }
    case 'OneOf': {
      return chain.description[route['tag']].printChunks(route);
    }
    case 'Extra': {
      return [[], {}];
    }
    case 'Custom': {
      return chain.print(route);
    }
    case 'Embed': {
      return chain.parser.printChunks(route[chain.key]);
    }
  }
}
