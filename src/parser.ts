import isEqual from './internal/isequal';
import { Option, some, none, traverse } from './internal/option'
import { Expr } from './internal/expr';
import * as adapter from './adapter';
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
export type UrlChunks = [string[], Record<string, string>]


/// reversible parser
export class Parser<O,I=O,Extra={}> {
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
      const output = this.parseStateImpl(this.chain[i], state).map(([r, s]) => [Object.assign({}, route, r), s]);
      if (i < this.chain.length - 1) return Array.prototype.concat.apply([], output.map(([r, s]) => loop(i + 1, r, s)));
      return output;
    };
    return loop(0, {}, state);
  }
  
  /// parse state
  parseStateImpl(chain: ParserChain, state: ParserState): Array<[O, ParserState]> {
    const $this = chain;
    switch($this.tag) {
    case 'Params': {
      const output = {} as O;
      for (let key in $this.description) {
	if (!$this.description.hasOwnProperty(key)) continue;
	const item = $this.description[key];
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
      const result = $this.adapter.applyTotal(segment);
      if (result.tag === 'None') return [];
      output[$this.key] = result.value;
      const unvisited = state.unvisited.slice(1);
      const visited = state.visited.concat(segment);
      return [[output, { unvisited, visited, params: state.params }]];   
    }
    case 'Path': {
      const output = {} as O;
      let mathes = true;
      for (let j in $this.segments) if (state.unvisited[j] !== $this.segments[j]) { mathes = false; break; }
      if (!mathes) return [];
      const unvisited = state.unvisited.slice(0);
      const visited = state.visited.concat(unvisited.splice(0, $this.segments.length));
      return [[output, { unvisited, visited, params: state.params }]];
    }
    case 'OneOf': {
      const output: any[] = []
      for (const key in $this.description) {
	if (!$this.description.hasOwnProperty(key)) continue;
	for (const pair of $this.description[key].parseState(state)) {
	  output.push(pair);
	}
      }
      return output;
    }
    case 'Extra': {
      return [[$this.payload as O, state]];
    }
    case 'Custom': {
      return $this.parse(state);
    }
    case 'Embed': {
      return $this.parser.parseState(state).map(([r, s]) => [{ [$this.key]: r }, s] as any);
    }
    }
  }

  /// print route to chunks
  printChunks(route: I): UrlChunks {
    return this.chain.map(x => this.printChunksImpl(x, route)).reduce((acc, [segments, params]: any) => {
      for (let segment of segments) acc[0].push(segment);
      for (let key in params) params.hasOwnProperty(key) && (acc[1][key] = params[key]);
      return acc;
    }, [[], {}]);
  }
  
  printChunksImpl(chain: ParserChain, route: I): UrlChunks {
    const $this = chain;
    switch($this.tag) {
    case 'Params': {
      const params = {} as any;
      for (let key in $this.description) { 
	if (!$this.description.hasOwnProperty(key)) continue;
	const item = $this.description[key];
	const adapter = item.tag === 'NamedAdapter' ? item.adapter : item;
	const paramKey = item.tag === 'NamedAdapter' ? item.name : key;
	const maybeValue = adapter.unapplyPartial(route[key]);
	if (maybeValue.tag === 'Some') params[paramKey] = maybeValue.value;
      }
      return [[], params];
    }
    case 'Segment': {
      const segment = $this.adapter.unapplyTotal(route[$this.key]);
      return [[prettyUriEncode(segment)], {}];
    }
    case 'Path': {
      return [$this.segments, {}];
    }
    case 'OneOf': {
      return $this.description[route['tag']].printChunks(route);
    }
    case 'Extra': {
      return [[], {}];
    }
    case 'Custom': {
      return $this.print(route);
    }
    case 'Embed': {
      return $this.parser.printChunks(route[$this.key]);
    }
    }
  }

  /// path
  path(segmentsStr: string): Parser<O,I,Extra> {
    const segments = segmentsStr.split('/').filter(x => x !== '').map(prettyUriEncode);
    return new Parser(this.chain.concat({ tag: 'Path', segments } as PathChain));
  }
  
  /// segment
  segment<K extends string, B>(key: K, adapter: HasTotalAdapter<B>): Parser<O & { [k in K]: B }, I & { [k in K]: B }, Extra> {
    return new Parser(this.chain.concat({ tag: 'Segment', key, adapter } as SegmentChain));
  }
  
  /// params
  params<Keys extends Record<string, HasPartialAdapter<any>>>(description: Keys): Parser<O & { [k in keyof Keys]: Keys[k]['_A'] }, I & { [k in keyof Keys]: Keys[k]['_A'] }, Extra> {
    return new Parser(this.chain.concat({ tag: 'Params', description } as ParamsChain));
  }
  
  /// join
  join<That extends Parser<any,any,any>>(that: That): Parser<O & That['_O'], I & That['_I'], Extra & That['_Extra']> {
    return new Parser(this.chain.concat(that.chain));
  }
  
  /// embed
  embed<K extends string, That extends Parser<any,any,any>>(key: K, that: That): Parser<O & { [k in K]: That['_O'] }, I & { [k in K]: That['_I'] }, Extra> {
    return new Parser(this.chain.concat({ tag: 'Embed', key, parser: that } as EmbedChain));
  }
  
  /// extra
  extra<E>(payload: E): Parser<O & E, I, Extra & E> {
    return new Parser(this.chain.concat({ tag: 'Extra', payload } as ExtraChain<E>));
  }  
}


/// Chains
export type ParamsChain = { tag: 'Params', description: Record<string, HasPartialAdapter<any>> };
export type SegmentChain = { tag: 'Segment', key: string, adapter: HasTotalAdapter<any> };
export type PathChain = { tag: 'Path', segments: string[] };
export type EmbedChain = { tag: 'Embed', key: string, parser: Parser<any,any,any> };
export type OneOfChain = { tag: 'OneOf', description: Record<string, Parser<any,any,any>> };
export type ExtraChain<T> = { tag: 'Extra', payload: T };
export type CustomChain<O,I> = { tag: 'Custom', parse(s: ParserState): Array<[O, ParserState]>, print(a: I): [string[], Record<string, string>] };
export type ParserChain<O=any,I=O,E=any> =
  | ParamsChain
  | SegmentChain
  | PathChain
  | EmbedChain
  | OneOfChain
  | ExtraChain<E>
  | CustomChain<O,I>


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
    else throw new Error(`oneOf: all arguments should have tags`);
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
export function printChunks(chunks: [Array<string>, Record<string, string>]): string {
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

