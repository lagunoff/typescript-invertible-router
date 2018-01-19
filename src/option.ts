import { Expr } from './internal/expr';


// adt
export type Option<a> = None<a> | Some<a>;
export type Maybe<a> = Option<a>;


// Base class with instance methods
export class OptionBase<A> {
  readonly _A: A;

  /** Apply function `f` to the underlying value */
  map<B>(f: (a: A) => B): Option<B> {
    const $this = this as any as Option<A>;
    switch ($this.tag) {
      case 'None': return $this as any;
      case 'Some': return new Some(f($this.value));
    }
  }

  /** Extract value from `this` then apply `f` to the result */
  chain<B>(f: (a: A) => Option<B>): Option<B> {
    const $this = this as any as Option<A>;
    switch ($this.tag) {
      case 'None': return $this as any;
      case 'Some': return f($this.value);
    }
  }

  /** Unwrap underlying value */
  fold<B extends Expr, C extends Expr>(fromNone: B, fromSome: (x: A) => C): B|C {
    const $this = this as any as Option<A>;
    switch ($this.tag) {
      case 'None': return fromNone;
      case 'Some': return fromSome($this.value);
    }
  }

  /** Unwrap value by providing result for `None` case */
  withDefault<B extends Expr>(fromNone: B): A|B {
    return this.fold(fromNone, x => x);
  }
}

  
/**
 * Class which instances denote absence of value, similar to `null` and
 * `undefined`
 */
export class None<A> extends OptionBase<A> {
  readonly _A: A;
  readonly tag: 'None' = 'None';
}


/** Contains one single value */
export class Some<A> extends OptionBase<A> {
  readonly _A: A;
  readonly tag: 'Some' = 'Some';
  
  constructor(
    readonly value: A,
  ) { super(); }
}


/**
 *  Apply `f` to each element of `xs` and collect the results
 *
 * ```ts
 * const safeDiv = (a: number, b: number) => b === 0 ? none : some(a / b);
 * const divisors1 = [1, 2, 3, 4];
 * const divisors2 = [0, 1, 2, 3];
 * console.log(traverse(divisors1, b => safeDiv(10, b))); // => Some { value: [...] }
 * console.log(traverse(divisors2, b => safeDiv(10, b))); // => None { }
 * ```
 */
export function traverse<A, B>(xs: Array<A>, f: (a: A) => Option<B>): Option<B[]> {
  const output = [] as B[];
  for (const el of xs) {
    const option = f(el);
    switch (option.tag) {
      case 'None': return none;
      case 'Some': output.push(option.value); break;
    }
  }
  return new Some(output);
}


// Aliases
export const none = new None<any>();
export function some<A extends Expr>(a: A): Option<A> { return new Some<A>(a); }
export { some as of };
