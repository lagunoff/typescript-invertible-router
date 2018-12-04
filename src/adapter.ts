import { Expr, absurd } from './internal/types';
import { Option, some, none, traverse, None } from './option';
import isEqual from './internal/isequal';


// Aliases
export type Adapter<A, F={}> =
  | CustomAdapter<A, F>
  | NamedAdapter<A, F>
  | DefaultAdapter<A, F>
  | DimapAdapter<A, F>
  | HasAdapter<A, F>
  ;


// Type-level flags
export type Flags = {
  hasName: true;
  hasDefault: true;
  nonEmpty: true;
};


// Instance methods
export class AdapterBase<A, F={}> {
  readonly _A: A;
  readonly _F: F;

  apply(s: string): Option<A> {
    const self = this as any as Adapter<A, F>;
    
    if (self instanceof CustomAdapter) {
      return self._apply(s);
    }

    if (self instanceof NamedAdapter) {
      return self._adapter.apply(s);
    }

    if (self instanceof DefaultAdapter) {
      return self._adapter.apply(s);
    }

    if (self instanceof DimapAdapter) {
      return self._adapter.apply(s).map(self._map);
    }

    if (self instanceof HasAdapter) {
      return self.toAdapter().apply(s);
    }

    return absurd(self);
  }

  unapply(a: A): string {
    const self = this as any as Adapter<A, F>;
    
    if (self instanceof CustomAdapter) {
      return self._unapply(a);
    }

    if (self instanceof NamedAdapter) {
      return self._adapter.unapply(a);
    }

    if (self instanceof DefaultAdapter) {
      return self._adapter.unapply(a);
    }

    if (self instanceof DimapAdapter) {
      return self._adapter.unapply(self._comap(a));
    }

    if (self instanceof HasAdapter) {
      return self.toAdapter().unapply(a);
    }
    
    return absurd(self);    
  }

  applyOption(s: Option<string>): Option<A> {
    const self = this as any as Adapter<A, F>;
    
    if (self instanceof CustomAdapter) {
      return s.chain(self._apply);
    }

    if (self instanceof NamedAdapter) {
      return self._adapter.applyOption(s);
    }

    if (self instanceof DefaultAdapter) {
      return s instanceof None ? some(self._default) : self._adapter.applyOption(s);
    }

    if (self instanceof DimapAdapter) {
      return self._adapter.applyOption(s).map(self._map);
    }

    if (self instanceof HasAdapter) {
      return self.toAdapter().applyOption(s);
    }

    return absurd(self);
  }

  
  unapplyOption(a: A): Option<string> {
    const self = this as any as Adapter<A, F>;
    
    if (self instanceof CustomAdapter) {
      return some(self._unapply(a));
    }

    if (self instanceof NamedAdapter) {
      return self._adapter.unapplyOption(a);
    }

    if (self instanceof DefaultAdapter) {
      return isEqual(a, self._default) ? none : self._adapter.unapplyOption(a);
    }

    if (self instanceof DimapAdapter) {
      return self._adapter.unapplyOption(self._comap(a));
    }

    if (self instanceof HasAdapter) {
      return self.toAdapter().unapplyOption(a);
    }

    return absurd(self);    
  }
  

  /**
   * Set different parameter name compared to the name of the field
   * 
   * ```ts
   * const parser = r.path('/home').params({ snakeCase: r.nat.withName('snake_case') });
   * console.log(parser.print({ snakeCase: 42 }));  // => "home?snake_case=42"
   * ```
   */
  withName(name: string) {
    return new NamedAdapter<A, F & { hasName: true }>(this as any, name);
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
  withDefault<B>(_default: B) {
    return new DefaultAdapter<A|B, F & { hasDefault: true }>(this as any, _default);
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
  dimap<B>(map: (a: A) => B, comap: (b: B) => A) {
    return new DimapAdapter<B, F, A>(map, comap, this as any);
  }
}


export class CustomAdapter<A, F={}> extends AdapterBase<A, F> {
  constructor(
    readonly _apply: (s: string) => Option<A>,
    readonly _unapply: (a: A) => string,
  ) { super(); }
}


export class NamedAdapter<A, F={}> extends AdapterBase<A, F> {
  constructor(
    readonly _adapter: Adapter<A, any>,
    readonly _name: string,
  ) { super(); }
}


export class DefaultAdapter<A, F={}> extends AdapterBase<A, F> {
  constructor(
    readonly _adapter: Adapter<A, any>,
    readonly _default: A,
  ) { super(); }
}


export class DimapAdapter<A, F={}, B=any> extends AdapterBase<A, F> {
  constructor(
    readonly _map: (x: B) => A,
    readonly _comap: (x: A) => B,
    readonly _adapter: Adapter<B, F>,
  ) { super(); }
}

export abstract class HasAdapter<A, F={}> extends AdapterBase<A, F> {
  abstract toAdapter(): Adapter<A, F>;
}


/** Strings */
const stringAdapter = new CustomAdapter<string, {}>(some, x => x);
export { stringAdapter as string };


/** Non-empty strings */
const nestringAdapter = new CustomAdapter<string, { nonEmpty: true }>(
  x => x !== '' ? some(x) : none,
  x => x,
);
export { nestringAdapter as nestring };


/** Natural numbers (0, 1, 2, ...) */
const natAdapter = new CustomAdapter<number, { nonEmpty: true }>(
  str => { const i = parseInt(str); return !isNaN(i) && i >= 0 ? some(i) : none; },
  String,
);
export { natAdapter as nat };


/** Integers (..., -1, 0, 1, 2, ...) */
const intAdapter = new CustomAdapter<number, { nonEmpty: true }>(
  str => { const i = parseInt(str); return !isNaN(i) ? some(i) : none; },
  String,
);
export { intAdapter as int };


/** Dates as iso-8601 */
const iso8601Adapter = new CustomAdapter<Date>(
  str => { const d = new Date(str); return isNaN(d.valueOf()) ? none : some(d); },
  d => d.toISOString(),
);
export { iso8601Adapter as date };


/** Booleans */
const booleanAdapter = new CustomAdapter<boolean>(
  x => x === '' || x === 'false' || x === '0' || x === 'off' ? some(false) : some(true),
  x => x ? 'true' : 'false',
).withDefault(false);
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
export function array<A>(adapter: Adapter<A>): CustomAdapter<A[]> {
  return new CustomAdapter<A[]>(
    str => traverse(parseCsv(str), x => adapter.apply(x)), 
    xs => printCsv(xs.map(x => adapter.unapply(x))),
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
export function literals<A extends string[]>(...a: A): Adapter<A>;
export function literals<array extends Array<Expr>>(array: array): Adapter<array[number]>;
export function literals(): Adapter<string> {
  const literals: ArrayLike<string> = Array.isArray(arguments[0]) ? arguments[0] : arguments;
  const apply = str => {
    for (let i = 0; i < literals.length; i++) if (literals[i] === str) return some(str);
    return none;
  };
  const unapply = x => x;
  return new CustomAdapter(apply, unapply);
}


/** Create adapter that always succeeds with the given value */
export function of<A extends Expr>(a: A): CustomAdapter<A, {}> {
  const applyTotal = () => some(a);
  const unapplyTotal = () => '';
  return new CustomAdapter(applyTotal, unapplyTotal);
}


/** Constructor for `TotalAdapter` */
export function custom<A>(apply: (s: string) => Option<A>, unapply: (a: A) => string) {
  return new CustomAdapter<A>(apply, unapply);
}


// -- Helpers --

// Escape and join given array of strings
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


// Parse comma-separated string into an array
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
