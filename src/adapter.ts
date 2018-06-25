import { Expr } from './internal/expr';
import { Option, some, none, traverse } from './option';


// Type-level flags
export type Flags = {
  hasName?: true;
  hasDefault?: true;
  hasPartial?: true;
  hasTotal?: true;
};


// Base class with instance methods
export class AdapterBase<A, F extends Flags> {
  readonly _A: A;
  readonly _F: F;

  /**
   * Set different parameter name compared to the name of the field
   * 
   * ```ts
   * const parser = r.path('/home').params({ snakeCase: r.nat.withName('snake_case') });
   * console.log(parser.print({ snakeCase: 42 }));  // => "home?snake_case=42"
   * ```
   */
  withName(name: string): NamedAdapter<A, SetName<F>> {
    const self = this as any as Adapter<A, F>;
    return new NamedAdapter(self, name);
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
  withDefault<B>(_default: B): Adapter<A|B, F & { hasDefault: true }> {
    const self = this as any as Adapter<A|B, F>;
    return new DefaultAdapter(self, _default);
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
  dimap<B>(proj: (a: A) => B, coproj: (b: B) => A): Adapter<B, F> {
    const self = this as any as Adapter<A, F>;
    switch (self.tag) {
      case 'TotalAdapter': {
        const applyTotal = (s: string) => self._applyTotal(s).map(proj);
        const unapplyTotal = (b: B) => self._unapplyTotal(coproj(b));
        const adapter = self._adapter ? self._adapter.dimap(proj, coproj) : undefined;
        return new TotalAdapter(applyTotal, unapplyTotal, adapter);
      }
      case 'PartialAdapter': {
        const applyPartial = (s: Option<string>) => self._applyPartial(s).map(proj);
        const unapplyPartial = (b: B) => self._unapplyPartial(coproj(b));
        const adapter = self._adapter ? self._adapter.dimap(proj, coproj) : undefined;
        return new PartialAdapter(applyPartial, unapplyPartial, adapter);
      }
      case 'DefaultAdapter': {
        return new DefaultAdapter(self._adapter.dimap(proj, coproj), proj(self._default));
      }
      case 'NamedAdapter': {
        return new NamedAdapter(self._adapter.dimap(proj, coproj), self._name);
      }
    }
  }


  /** Find implementation of given flag */
  getImpl<K extends keyof Flags, F extends { [K_ in K]: true }>(this: Adapter<A, F>, k: K): GetImpl<A>[K];
  getImpl<K extends keyof Flags>(this: Adapter<A, any>, k: K): GetImpl<A>[K] | null;
  getImpl<K extends keyof Flags>(this: Adapter<A, any>, k: K): GetImpl<A>[K] | null {
    const self = this as any as Adapter<A, F>;
    switch (self.tag) {
      case 'TotalAdapter': {
        if (k === 'hasTotal') return self;
        if (self._adapter) return self._adapter.getImpl(k);
        return null;
      }
      case 'PartialAdapter': {
        if (k === 'hasPartial') return self;
        if (self._adapter) return self._adapter.getImpl(k);
        return null;
      }
      case 'NamedAdapter': {
        if (k === 'hasName') return self;
        return self._adapter.getImpl(k);
      }
      case 'DefaultAdapter': {
        if (k === 'hasDefault') return self;
        return self._adapter.getImpl(k);
      }
    }
  }
}


/**
 * `TotalAdapter<A>` describes mutual correspondence between `string`
 * and `A`. These adapters are used in `r.array` and `r.segment`
 */
export class TotalAdapter<A, F extends Flags> extends AdapterBase<A, F> {
  readonly tag: 'TotalAdapter' = 'TotalAdapter';

  constructor(
    readonly _applyTotal: (s: string) => Option<A>,
    readonly _unapplyTotal: (a: A) => string,
    readonly _adapter?: Adapter<A, any>,
  ) { super(); }
}


/**
 * `PartialAdapter<A>` describes mutual correspondence between
 * `Option<string>` and `A`. These adapters are used in `r.param`
 */
export class PartialAdapter<A, F extends Flags> extends AdapterBase<A, F> {
  readonly tag: 'PartialAdapter' = 'PartialAdapter';

  constructor(
    readonly _applyPartial: (s: Option<string>) => Option<A>,
    readonly _unapplyPartial: (a: A) => Option<string>,
    readonly _adapter?: Adapter<A, any>,
  ) { super(); }
}


/** Contains another adapter and its name */
export class NamedAdapter<A, F extends Flags> extends AdapterBase<A, F> {
  readonly tag: 'NamedAdapter' = 'NamedAdapter';

  constructor(
    readonly _adapter: Adapter<A, any>,
    readonly _name: string,
  ) { super(); }
}


/** Default value */
export class DefaultAdapter<A, F extends Flags> extends AdapterBase<A, F> {
  readonly tag: 'DefaultAdapter' = 'DefaultAdapter';

  constructor(
    readonly _adapter: Adapter<A, any>,
    readonly _default: A,
  ) { super(); }
}


// Aliases
export type Adapter<A, F extends Flags> =
  | PartialAdapter<A, F>
  | TotalAdapter<A, F>
  | NamedAdapter<A, F>
  | DefaultAdapter<A, F>
  ;


/** Strings */
const stringAdapter = new PartialAdapter<string, Partial>(
  x => x, // applyPartial
  some, // unapplyPartial
);
export { stringAdapter as string };


/** Non-empty strings */
const nestringAdapter = new TotalAdapter<string, TotalAndPartial>(
  x => x !== '' ? some(x) : none, // applyTotal
  x => x, // unapplyTotal
  new PartialAdapter<string, Partial>(
    x => x.chain(str => str ? some(str) : none), // applyPartial
    some, // unapplyPartial
  ),
);
export { nestringAdapter as nestring };


/** Natural numbers (0, 1, 2, ...) */
const natAdapter = new TotalAdapter<number, TotalAndPartial>(
  str => { const i = parseInt(str); return !isNaN(i) && i >= 0 ? some(i) : none; }, // applyTotal
  String, // unapplyTotal
  new PartialAdapter<number, Partial>(
    x => x.chain(str => { const i = parseInt(str); return !isNaN(i) && i >= 0 ? some(i) : none; }), // applyPartial
    x => some(String(x)), // unapplyPartial
  ),
);
export { natAdapter as nat };


/** Integers (..., -1, 0, 1, 2, ...) */
const intAdapter = new TotalAdapter<number, TotalAndPartial>(
  str => { const i = parseInt(str); return !isNaN(i) ? some(i) : none; }, // applyTotal
  String, // unapplyTotal
  new PartialAdapter<number, Partial>(
    x => x.chain(str => { const i = parseInt(str); return !isNaN(i) ? some(i) : none; }), // applyPartial
    x => some(String(x)), // unapplyPartial
  ),
);
export { intAdapter as int };


/** Dates as iso-8601 */
const iso8601Adapter = new TotalAdapter<Date, TotalAndPartial>(
  str => { const d = new Date(str); return isNaN(d.valueOf()) ? none : some(d); }, // applyTotal
  d => d.toISOString(), // unapplyTotal
  new PartialAdapter<Date, Partial>(
    x => x.chain(str => { const d = new Date(str); return isNaN(d.valueOf()) ? none : some(d); }), // applyPartial
    d => some(d.toISOString()), // unapplyPartial
  ),
);
export { iso8601Adapter as date };


/** Booleans */
const booleanAdapter = new TotalAdapter<boolean, TotalAndPartial>(
  x => x === '' || x === 'false' || x === '0' || x === 'off' ? some(false) : some(true), // applyTotal
  x => x ? 'true' : 'false', // unapplyTotal
  new PartialAdapter<boolean, Partial>(
    x => x.fold(some(false), () => some(true)), // applyPartial
    x => x ? some('') : none,  // unapplyPartial
  ),
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
export function array<A, F extends { hasTotal: true }>(adapter: Adapter<A, F>): Adapter<A[], TotalAndPartial> {
  return new TotalAdapter<A[], TotalAndPartial>(
    str => traverse(parseCsv(str), x => adapter.getImpl('hasTotal')._applyTotal(x)), // applyTotal
    arr => printCsv(arr.map(x => adapter.getImpl('hasTotal')._unapplyTotal(x))), // unapplyTotal
    new PartialAdapter<A[], Partial>(
      x => x.chain(str => traverse(parseCsv(str), x => adapter.getImpl('hasTotal')._applyTotal(x))), // applyPartial
      arr => some(printCsv(arr.map(x => adapter.getImpl('hasTotal')._unapplyTotal(x)))), // unapplyPartial
    )
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
export function literals<A extends string>(a: A): Adapter<A, TotalAndPartial>;
export function literals<A extends string, B extends string>(a: A, b: B): Adapter<A|B, TotalAndPartial>;
export function literals<A extends string, B extends string, C extends string>(a: A, b: B, c: C): Adapter<A|B|C, TotalAndPartial>;
export function literals<A extends string, B extends string, C extends string, D extends string>(a: A, b: B, c: C, d: D): Adapter<A|B|C|D, TotalAndPartial>;
export function literals<A extends string, B extends string, C extends string, D extends string, E extends string>(a: A, b: B, c: C, d: D, e: E): Adapter<A|B|C|D|E, TotalAndPartial>;
export function literals<array extends Array<Expr>>(array: array): Adapter<array[number], TotalAndPartial>;
export function literals(): Adapter<string, TotalAndPartial> {
  const literals: ArrayLike<string> = Array.isArray(arguments[0]) ? arguments[0] : arguments;
  const applyTotal = str => {
    for (let i = 0; i < literals.length; i++) if (literals[i] === str) return some(str);
    return none;
  };
  const unapplyTotal = x => x;
  const applyPartial = (maybeStr: Option<string>) => maybeStr.chain(applyTotal);
  const unapplyPartial = some;
  return new TotalAdapter(applyTotal, unapplyTotal, new PartialAdapter(applyPartial, unapplyPartial));
}


/** Create adapter that always succeeds with the given value */
export function of<A extends Expr>(a: A): Adapter<A, TotalAndPartial> {
  const applyTotal = () => some(a);
  const unapplyTotal = () => '';
  const applyPartial = applyTotal;
  const unapplyPartial = () => none;
  return new TotalAdapter(applyTotal, unapplyTotal, new PartialAdapter(applyPartial, unapplyPartial));
}


/** Constructor for `PartialAdapter` */
export function partialAdapter<A>(applyPartial: (s: Option<string>) => Option<A>, unapplyPartial: (a: A) => Option<string>): PartialAdapter<A, Partial> {
  return new PartialAdapter(applyPartial, unapplyPartial);
}


/** Constructor for `TotalAdapter` */
export function totalAdapter<A>(applyTotal: (s: string) => Option<A>, unapplyTotal: (a: A) => string): TotalAdapter<A, Total> {
  return new TotalAdapter(applyTotal, unapplyTotal);
}


// /** Constructor for `PartialAndTotalAdapter` */
// export function partialAndTotalAdapter<A>(
//   applyTotal: (s: string) => Option<A>,
//   unapplyTotal: (a: A) => string,
//   applyPartial: (s: Option<string>) => Option<A>,
//   unapplyPartial: (a: A) => Option<string>,
// ): PartialAndTotalAdapter<A> {
//   return new PartialAndTotalAdapter<A>(applyTotal, unapplyTotal, applyPartial, unapplyPartial);
// }


// -- Helpers --


// Types
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type SetName<F extends Flags> = Omit<Flags, 'hasName'> & { hasName: true };
export type SetDefault<F extends Flags> = Omit<Flags, 'hasDefault'> & { hasDefault: true };
export type SetPartial<F extends Flags> = Omit<Flags, 'hasPartial'> & { hasPartial: true };
export type SetTotal<F extends Flags> = Omit<Flags, 'hasTotal'> & { hasTotal: true };
export type Partial = { hasPartial: true };
export type Total = { hasPartial: true };
export type TotalAndPartial = { hasTotal: true, hasPartial: true };
export interface GetImpl<T> {
  hasName: NamedAdapter<T, any>;
  hasDefault: DefaultAdapter<T, any>;
  hasTotal: TotalAdapter<T, any>;
  hasPartial: PartialAdapter<T, any>;
}


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
