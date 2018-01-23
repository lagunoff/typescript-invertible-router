import isEqual from './internal/isequal'; // tslint:disable-line:import-name
import { Expr } from './internal/expr';
import { Option, some, none, traverse } from './option';


// Base class with instance methods
export class AdapterBase<A> {
  readonly _A: A;

  /**
   * Set different parameter name compared to the name of the field
   * 
   * ```ts
   * const parser = r.path('/home').params({ snakeCase: r.nat.withName('snake_case') });
   * console.log(parser.print({ snakeCase: 42 }));  // => "home?snake_case=42"
   * ```
   */
  withName(this: HasPartialAdapter<A>, name: string): NamedAdapter<A> {
    const $this = this;
    if ($this.tag === 'NamedAdapter') return new NamedAdapter(name, $this.adapter);
    return new NamedAdapter(name, $this);
  }

  /**
   * Provide default value, new adapter will always succeed
   *
   * ```ts
   * const parser = r.path('shop/items').params({ search: r.string.withDefault(''), page: r.nat.withDefault(1) });
   * console.log(parser.parse('/shop/items')); // => { search: "", page: 1 }
   * console.log(parser.print({ search: 'apples', page: 2 })); // => "shop/items?search=apples&page=2"
   * console.log(parser.print({ search: '', page: 1 })); // => "shop/items"
   * ```
   */
  withDefault(this: TotalAdapter<A>, defaultVal: A): TotalAdapter<A>;
  withDefault<B>(this: PartialAndTotalAdapter<A>, defaultVal: B): PartialAdapter<A|B>;
  withDefault<B>(this: PartialAdapter<A>, defaultVal: B): PartialAdapter<A|B>;
  withDefault<B>(this: NamedAdapter<A>, defaultVal: B): NamedAdapter<A|B>;
  withDefault<B>(this: Adapter<A>, defaultVal: B): Adapter<A|B>;
  withDefault<B>(this: Adapter<A>, defaultVal: B): Adapter<A|B> {
    const $this = this;
    switch ($this.tag) {
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

  /**
   * Change type variable inside `Adapter`, similar to
   * `Array.prototype.map`, but requires two functions
   *
   * ```ts
   * const litAdapter = r.literals('one', 'two', 'three');
   * const choiceAdapter = litAdapter.dimap(
   *   n => ['one', 'two', 'three'].indexOf(n) + 1,
   *   n => ['one', 'two', 'three'][n - 1] as any,
   * );
   * const parser = r.path('/quiz').params({ choice: choiceAdapter });
   * console.log(parser.parse('/quiz?choice=three')); // => { choice: 3 }
   * console.log(parser.print({ choice: 1 })); // => "quiz?choice=one"
   * ```
   */
  dimap<B>(this: TotalAdapter<A>, f: (a: A) => B, g: (b: B) => A): TotalAdapter<B>;
  dimap<B>(this: PartialAndTotalAdapter<A>, f: (a: A) => B, g: (b: B) => A): PartialAndTotalAdapter<B>;
  dimap<B>(this: PartialAdapter<A>, f: (a: A) => B, g: (b: B) => A): PartialAdapter<B>;
  dimap<B>(this: NamedAdapter<A>, f: (a: A) => B, g: (b: B) => A): NamedAdapter<B>;
  dimap<B>(this: Adapter<A>, f: (a: A) => B, g: (b: B) => A): Adapter<B>;
  dimap<B>(this: Adapter<A>, f: (a: A) => B, g: (b: B) => A): Adapter<B> {
    const $this = this;
    switch ($this.tag) {
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


/**
 * `TotalAdapter<A>` describes mutual correspondence between `string`
 * and `A`. These adapters are used in `r.array` and `r.segment`
 */
export class TotalAdapter<A> extends AdapterBase<A> {
  readonly tag: 'TotalAdapter' = 'TotalAdapter';

  constructor(
    readonly applyTotal: (s: string) => Option<A>,
    readonly unapplyTotal: (a: A) => string,
  ) { super(); }
}


/**
 * `PartialAdapter<A>` describes mutual correspondence between
 * `Option<string>` and `A`. These adapters are used in `r.param`
 */
export class PartialAdapter<A> extends AdapterBase<A> {
  readonly tag: 'PartialAdapter' = 'PartialAdapter';

  constructor(
    readonly applyPartial: (s: Option<string>) => Option<A>,
    readonly unapplyPartial: (a: A) => Option<string>,
  ) { super(); }
}


/** Combination of `TotalAdapter<A>` and `PartialAdapter<A>` */
export class PartialAndTotalAdapter<A> extends AdapterBase<A> {
  readonly tag: 'PartialAndTotalAdapter' = 'PartialAndTotalAdapter';

  constructor(
    readonly applyTotal: (s: string) => Option<A>,
    readonly unapplyTotal: (a: A) => string,
    readonly applyPartial: (s: Option<string>) => Option<A>,
    readonly unapplyPartial: (a: A) => Option<string>,
  ) { super(); }
}


/** Contains another adapter and its name */
export class NamedAdapter<A> extends AdapterBase<A> {
  readonly tag: 'NamedAdapter' = 'NamedAdapter';

  constructor(
    readonly name: string,
    readonly adapter: PartialAdapter<A>|PartialAndTotalAdapter<A>,
  ) { super(); }
}


// Aliases
export type Adapter<A> = PartialAdapter<A>|TotalAdapter<A>|PartialAndTotalAdapter<A>|NamedAdapter<A>;
export type HasTotalAdapter<A> = TotalAdapter<A>|PartialAndTotalAdapter<A>;
export type HasPartialAdapter<A> = PartialAdapter<A>|PartialAndTotalAdapter<A>|NamedAdapter<A>;


/** Strings */
const stringAdapter = new PartialAdapter<string>(
  x => x, // applyPartial
  some, // unapplyPartial
);
export { stringAdapter as string };


/** Non-empty strings */
const nestringAdapter = new PartialAndTotalAdapter<string>(
  x => x !== '' ? some(x) : none, // applyTotal
  x => x, // unapplyTotal
  x => x.chain(str => str ? some(str) : none), // applyPartial
  some, // unapplyPartial
);
export { nestringAdapter as nestring };


/** Natural numbers (0, 1, 2, ...) */
const natAdapter = new PartialAndTotalAdapter<number>(
  str => { const i = parseInt(str); return !isNaN(i) && i >= 0 ? some(i) : none; }, // applyTotal
  String, // unapplyTotal
  x => x.chain(str => { const i = parseInt(str); return !isNaN(i) && i >= 0 ? some(i) : none; }), // applyPartial
  x => some(String(x)), // unapplyPartial
);
export { natAdapter as nat };


/** Integers (..., -1, 0, 1, 2, ...) */
const intAdapter = new PartialAndTotalAdapter<number>(
  str => { const i = parseInt(str); return !isNaN(i) ? some(i) : none; }, // applyTotal
  String, // unapplyTotal
  x => x.chain(str => { const i = parseInt(str); return !isNaN(i) ? some(i) : none; }), // applyPartial
  x => some(String(x)), // unapplyPartial
);
export { intAdapter as int };


/** Dates as iso-8601 */
const iso8601Adapter = new PartialAndTotalAdapter<Date>(
  str => { const d = new Date(str); return isNaN(d.valueOf()) ? none : some(d); }, // applyTotal
  d => d.toISOString(), // unapplyTotal
  x => x.chain(str => { const d = new Date(str); return isNaN(d.valueOf()) ? none : some(d); }), // applyPartial
  d => some(d.toISOString()), // unapplyPartial
);
export { iso8601Adapter as date };


/** Booleans */
const booleanAdapter = new PartialAndTotalAdapter<boolean>(
  x => x === '' || x === 'false' || x === '0' || x === 'off' ? some(false) : some(true), // applyTotal
  x => x ? 'true' : 'false', // unapplyTotal
  x => x.fold(some(false), () => some(true)), // applyPartial
  x => x ? some('') : none,  // unapplyPartial
);
export { booleanAdapter as boolean };


/**
 * Comma-separated list
 * 
 * ```ts
 * const statusAdapter = r.literals('pending', 'scheduled', 'done');
 * const parser = r.path('/todos').params({ statuses: r.array(statusAdapter) });
 * type Route = typeof parser['_O']; // { statuses: Array<'pending'|'scheduled'|'done'> }
 * console.log(parser.print({ statuses: ['pending', 'scheduled'] })); // => "todos?statuses=pending,scheduled"
 * ```
 */
export function array<A>(adapter: HasTotalAdapter<A>): PartialAndTotalAdapter<A[]> {
  return new PartialAndTotalAdapter(
    str => traverse(parseCsv(str), x => adapter.applyTotal(x)), // applyTotal
    arr => printCsv(arr.map(x => adapter.unapplyTotal(x))), // unapplyTotal
    x => x.chain(str => traverse(parseCsv(str), x => adapter.applyTotal(x))), // applyPartial
    arr => some(printCsv(arr.map(x => adapter.unapplyTotal(x)))), // unapplyPartial
  );
}


/**
 * Union of string literals
 * 
 * ```ts
 * const fruitAdapter = r.literals('apple', 'orange', 'banana');
 * const parser = r.path('/fruits').segment('fruit', fruitAdapter);
 * type Route = typeof parser['_O']; // { fruit: 'apple'|'orange'|'banana' }
 * console.log(parser.print({ fruit: 'apple' })); // => "fruits/apple"
 * console.log(parser.parse('fruits/apple')); // => { fruit: "apple" }
 * console.log(parser.parse('fruits/potato')); // => null
 * ```
 */
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


/** Create adapter that always succeeds with the given value */
export function of<A extends Expr>(a: A): PartialAndTotalAdapter<A> {
  const applyTotal = () => some(a);
  const unapplyTotal = () => '';
  const applyPartial = applyTotal;
  const unapplyPartial = () => none;
  return new PartialAndTotalAdapter(applyTotal, unapplyTotal, applyPartial, unapplyPartial);
}


/** Constructor for `PartialAdapter` */
export function partialAdapter<A>(applyPartial: (s: Option<string>) => Option<A>, unapplyPartial: (a: A) => Option<string>): PartialAdapter<A> {
  return new PartialAdapter<A>(applyPartial, unapplyPartial);
}


/** Constructor for `TotalAdapter` */
export function totalAdapter<A>(applyTotal: (s: string) => Option<A>, unapplyTotal: (a: A) => string): TotalAdapter<A> {
  return new TotalAdapter<A>(applyTotal, unapplyTotal);
}


/** Constructor for `PartialAndTotalAdapter` */
export function partialAndTotalAdapter<A>(
  applyTotal: (s: string) => Option<A>,
  unapplyTotal: (a: A) => string,
  applyPartial: (s: Option<string>) => Option<A>,
  unapplyPartial: (a: A) => Option<string>,
): PartialAndTotalAdapter<A> {
  return new PartialAndTotalAdapter<A>(applyTotal, unapplyTotal, applyPartial, unapplyPartial);
}


// -- Helpers --


// escape and join given array of strings
function printCsv(values: Array<string>): string {
  if (values.length === 1 && values[0] === '') return '""';
  return values.map(str => {
    let output = '';
    for (let i = 0; i < str.length; i++) {
      switch (str[i]) {
        case '\\': output += '\\\\'; break;
        case ',': output += '\\,'; break;
        default: output += str[i]; break;
      }
    }
    return output;
  }).join(',');
}


// parse comma-separated string into an array
function parseCsv(str: string): Array<string> {
  if (str === '""') return [''];
  const output = [] as Array<string>;
  let escape = false;
  let cur = '';
  for (let i = 0;; i++) {
    if (i === str.length) { i !== 0 && output.push(cur); break; }
    switch (str[i]) {
      case ',': escape ? (cur += ',', escape = false) : (output.push(cur), cur = ''); break;
      case '\\': escape ? (cur += '\\', escape = false) : escape = true; break;
      default: cur += str[i]; break;
    }
  }
  return output;
}
