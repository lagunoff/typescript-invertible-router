import isEqual from './internal/isequal';
import { Option, some, none, traverse } from './internal/option'
import { Expr } from './internal/expr';


/// adapter instance methods
export class AdapterBase<A> {
  readonly _A: A;

  /// withName
  withName(this: HasPartialAdapter<A>, name: string): NamedAdapter<A> {
    const $this = this;
    if ($this.tag === 'NamedAdapter') return new NamedAdapter(name, $this.adapter);
    return new NamedAdapter(name, $this);
  }

  /// withDefault
  withDefault(this: TotalAdapter<A>, defaultVal: A): TotalAdapter<A>;
  withDefault<B>(this: PartialAndTotalAdapter<A>, defaultVal: B): PartialAdapter<A|B>;
  withDefault<B>(this: PartialAdapter<A>, defaultVal: B): PartialAdapter<A|B>;
  withDefault<B>(this: NamedAdapter<A>, defaultVal: B): NamedAdapter<A|B>;
  withDefault<B>(this: Adapter<A>, defaultVal: B): Adapter<A|B>;
  withDefault<B>(this: Adapter<A>, defaultVal: B): Adapter<A|B> {
    const $this = this as any as Adapter<A>;
    switch($this.tag) {
    case 'TotalAdapter': {
      const applyTotal = (s: string) => some($this.applyTotal(s).withDefault(defaultVal));
      const unapplyTotal = (a: A) => $this.unapplyTotal(a);
      return new TotalAdapter(applyTotal, unapplyTotal);
    }
    case 'PartialAdapter': {
      const applyPartial = (s: Option<string>) => some($this.applyPartial(s).withDefault(defaultVal));
      const unapplyPartial = (aOrB: A|B) => isEqual(aOrB, defaultVal) ? none : $this.unapplyPartial(aOrB as A);
      return new PartialAdapter(applyPartial, unapplyPartial);
    }
    case 'PartialAndTotalAdapter': {
      const applyPartial = (s: Option<string>) => some($this.applyPartial(s).withDefault(defaultVal));
      const unapplyPartial = (aOrB: A|B) => isEqual(aOrB, defaultVal) ? none : $this.unapplyPartial(aOrB as A);
      return new PartialAdapter(applyPartial, unapplyPartial);
    }
    case 'NamedAdapter': {
      return new NamedAdapter($this.name, $this.adapter.withDefault(defaultVal) as PartialAdapter<A>);
    }
    }
  }

  /// dimap
  dimap<B>(this: TotalAdapter<A>, f: (a: A) => B, g: (b: B) => A): TotalAdapter<B>;
  dimap<B>(this: PartialAndTotalAdapter<A>, f: (a: A) => B, g: (b: B) => A): PartialAndTotalAdapter<B>;
  dimap<B>(this: PartialAdapter<A>, f: (a: A) => B, g: (b: B) => A): PartialAdapter<B>;
  dimap<B>(this: NamedAdapter<A>, f: (a: A) => B, g: (b: B) => A): NamedAdapter<B>;
  dimap<B>(this: Adapter<A>, f: (a: A) => B, g: (b: B) => A): Adapter<B>;
  dimap<B>(this: Adapter<A>, f: (a: A) => B, g: (b: B) => A): Adapter<B> {
    const $this = this;
    switch($this.tag) {
    case 'TotalAdapter': {
      const applyTotal = (s: string) => $this.applyTotal(s).map(f);
      const unapplyTotal = (b: B) => $this.unapplyTotal(g(b));
      return new TotalAdapter(applyTotal, unapplyTotal);
    }
    case 'PartialAdapter': {
      const applyPartial = (s: Option<string>) => $this.applyPartial(s).map(f);
      const unapplyPartial = (b: B) => $this.unapplyPartial(g(b));
      return new PartialAdapter(applyPartial, unapplyPartial);
    }
    case 'PartialAndTotalAdapter': {
      const applyTotal = (s: string) => $this.applyTotal(s).map(f);
      const unapplyTotal = (b: B) => $this.unapplyTotal(g(b));
      const applyPartial = (s: Option<string>) => $this.applyPartial(s).map(f);
      const unapplyPartial = (b: B) => $this.unapplyPartial(g(b));
      return new PartialAndTotalAdapter(applyTotal, unapplyTotal, applyPartial, unapplyPartial);
    }
    case 'NamedAdapter': {
      return new NamedAdapter($this.name, $this.adapter.dimap(f, g) as PartialAdapter<B>);
    }
    }
  }
}


/// PartialAdapter
export class PartialAdapter<A> extends AdapterBase<A> {
  readonly tag: 'PartialAdapter' = 'PartialAdapter';

  constructor(
    readonly applyPartial: (s: Option<string>) => Option<A>,
    readonly unapplyPartial: (a: A) => Option<string>,
  ) { super(); }
}


/// TotalAdapter
export class TotalAdapter<A> extends AdapterBase<A> {
  readonly tag: 'TotalAdapter' = 'TotalAdapter';

  constructor(
    readonly applyTotal: (s: string) => Option<A>,
    readonly unapplyTotal: (a: A) => string,
  ) { super(); }
}


/// PartialAndTotalAdapter
export class PartialAndTotalAdapter<A> extends AdapterBase<A> {
  readonly tag: 'PartialAndTotalAdapter' = 'PartialAndTotalAdapter';

  constructor(
    readonly applyTotal: (s: string) => Option<A>,
    readonly unapplyTotal: (a: A) => string,
    readonly applyPartial: (s: Option<string>) => Option<A>,
    readonly unapplyPartial: (a: A) => Option<string>,
  ) { super(); }
}


/// NamedAdapter
export class NamedAdapter<A> extends AdapterBase<A> {
  readonly tag: 'NamedAdapter' = 'NamedAdapter';

  constructor(
    readonly name: string,
    readonly adapter: PartialAdapter<A>|PartialAndTotalAdapter<A>,
  ) { super(); }
}


/// aliases
export type Adapter<A> = PartialAdapter<A>|TotalAdapter<A>|PartialAndTotalAdapter<A>|NamedAdapter<A>;
export type HasTotalAdapter<A> = TotalAdapter<A>|PartialAndTotalAdapter<A>;
export type HasPartialAdapter<A> = PartialAdapter<A>|PartialAndTotalAdapter<A>|NamedAdapter<A>;


/// strings
const stringAdapter = new PartialAndTotalAdapter<string>(
  some, // applyTotal
  x => x, // unapplyTotal
  x => x, // applyPartial
  some, // unapplyPartial
);
export { stringAdapter as string };


/// non-empty strings
const nestringAdapter = new PartialAndTotalAdapter<string>(
  x => x !== '' ? some(x) : none, // applyTotal
  x => x, // unapplyTotal
  x => x.chain(str => str ? some(str) : none), // applyPartial
  some, // unapplyPartial
);
export { nestringAdapter as nestring };


/// natural numbers (0, 1, 2, ...)
const natAdapter = new PartialAndTotalAdapter<number>(
  str => { const i = parseInt(str); return !isNaN(i) && i >= 0 ? some(i) : none; }, // applyTotal
  String, // unapplyTotal
  x => x.chain(str => { const i = parseInt(str); return !isNaN(i) && i >= 0 ? some(i) : none; }), // applyPartial
  x => some(String(x)) // unapplyPartial
);
export { natAdapter as nat };


/// integers (..., -1, 0, 1, 2, ...)
const intAdapter = new PartialAndTotalAdapter<number>(
  str => { const i = parseInt(str); return !isNaN(i) ? some(i) : none; }, // applyTotal
  String, // unapplyTotal
  x => x.chain(str => { const i = parseInt(str); return !isNaN(i) ? some(i) : none; }), // applyPartial
  x => some(String(x)), // unapplyPartial
);
export { intAdapter as int };


/// dates as iso-8601
const iso8601Adapter = new PartialAndTotalAdapter<Date>(
  str => { const d = new Date(str); return isNaN(d.valueOf()) ? none : some(d); }, // applyTotal
  d => d.toISOString(), // unapplyTotal
  x => x.chain(str => { const d = new Date(str); return isNaN(d.valueOf()) ? none : some(d); }), // applyPartial
  d => some(d.toISOString()), // unapplyPartial
);
export { iso8601Adapter as date };


/// booleans
const booleanAdapter = new PartialAndTotalAdapter<boolean>(
  x => x === '' || x === 'false' || x === '0' || x === 'off' ? some(false) : some(true), // applyTotal
  x => x ? 'true' : 'false', // unapplyTotal
  x => x.unwrap(some(false), () => some(true)), // applyPartial
  x => x ? some('') : none,  // unapplyPartial
);
export { booleanAdapter as boolean };


/// arrays
export function array<A>(adapter: HasTotalAdapter<A>): PartialAndTotalAdapter<A[]> {
  return new PartialAndTotalAdapter(
    str => traverse(parseCsv(str), x => adapter.applyTotal(x)), // applyTotal
    arr => printCsv(arr.map(x => adapter.unapplyTotal(x))), // unapplyTotal
    x => x.chain(str => traverse(parseCsv(str), x => adapter.applyTotal(x))), // applyPartial
    arr => some(printCsv(arr.map(x => adapter.unapplyTotal(x)))), // unapplyPartial
  );
}


/// one or more string literals
export function literals<A extends string>(a: A): PartialAndTotalAdapter<A>;
export function literals<A extends string, B extends string>(a: A, b: B): PartialAndTotalAdapter<A|B>;
export function literals<A extends string, B extends string, C extends string>(a: A, b: B, c: C): PartialAndTotalAdapter<A|B|C>;
export function literals<A extends string, B extends string, C extends string, D extends string>(a: A, b: B, c: C, d: D): PartialAndTotalAdapter<A|B|C|D>;
export function literals<A extends string, B extends string, C extends string, D extends string, E extends string>(a: A, b: B, c: C, d: D, e: E): PartialAndTotalAdapter<A|B|C|D|E>;
export function literals<array extends Array<Expr>>(array: array): PartialAndTotalAdapter<array[number]>;
export function literals(): PartialAndTotalAdapter<string> {
  const literals: ArrayLike<string> = Array.isArray(arguments[0]) ? arguments[0] : arguments;
  const applyTotal = str => {
    for (let i = 0; i < literals.length; i++) if (literals[i] === str) return some(str);
    return none;
  };
  const unapplyTotal = x => x;
  const applyPartial = (maybeStr: Option<string>) => maybeStr.chain(applyTotal);
  const unapplyPartial = some;
  return new PartialAndTotalAdapter(applyTotal, unapplyTotal, applyPartial, unapplyPartial);
}


/// adapter that succeeds always with the same result
export function of<A extends Expr>(a: A): PartialAndTotalAdapter<A> {
  const applyTotal = () => some(a);
  const unapplyTotal = () => '';
  const applyPartial = applyTotal;
  const unapplyPartial = () => none;
  return new PartialAndTotalAdapter(applyTotal, unapplyTotal, applyPartial, unapplyPartial);
}


// ---------------------------------------------------------------------------
// helpers


/// escape and join given array of strings
function printCsv(values: Array<string>): string {
  if (values.length === 1 && values[0] === '') return '""';
  return values.map(str => {
    let output = '';
    for (let i = 0; i < str.length; i++) {
      switch(str[i]) {
        case '\\': output += '\\\\'; break;
        case ',': output += '\\,'; break;
        default: output += str[i]; break;
      }
    }
    return output;
  }).join(',');
}


/// parse comma-separated string into an array
function parseCsv(str: string): Array<string> {
  if (str === '""') return [""];
  const output = [] as Array<string>;
  let escape = false;
  let cur = '';
  for (let i = 0;; i++) {
    if (i === str.length) { i !== 0 && output.push(cur); break; }
    switch(str[i]) {
      case ',': escape ? (cur += ',', escape = false) : (output.push(cur), cur = ''); break;
      case '\\': escape ? (cur += '\\', escape = false) : escape = true; break;
      default: cur += str[i]; break;
    }
  }
  return output;
}