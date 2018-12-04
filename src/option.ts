import { Expr } from './internal/types';
import { absurd } from './internal/types';


// Aliases
export type Option<a> = None<a> | Some<a>;
export type Maybe<a> = Option<a>;


// Base class with instance methods
export class OptionBase<A> {
  readonly _A: A;

  isSome(): this is Some<A> {
    return this instanceof Some;
  }

  isNone(): this is None<A> {
    return this instanceof None;
  }

  /** Apply function `f` to the underlying value */
  map<B>(proj: (a: A) => B): Option<B> {
    const self = this as any as Option<A>;
    if (self instanceof None) return self as any;
    if (self instanceof Some) return new Some(proj(self.value));
    return absurd(self);
  }

  /** Extract value from `this` then apply `f` to the result */
  chain<B>(f: (a: A) => Option<B>): Option<B> {
    const self = this as any as Option<A>;
    if (self instanceof None) return self as any;
    if (self instanceof Some) return f(self.value);
    return absurd(self);
  }

  /** Unwrap underlying value */
  fold<B extends Expr, C extends Expr>(fromNone: B, fromSome: (x: A) => C): B|C {
    const self = this as any as Option<A>;
    if (self instanceof None) return fromNone;
    if (self instanceof Some) return fromSome(self.value);
    return absurd(self);
  }

  /** Unwrap value by providing result for `None` case */
  withDefault<B extends Expr>(fromNone: B): A|B {
    return this.fold(fromNone, x => x);
  }

  /** Similar to `||` operation with nullable types */
  or<B>(that: Option<B>): Option<B|A> {
    const self = this as any as Option<A>;
    if (self instanceof None) return that;
    if (self instanceof Some) return self;
    return absurd(self);
  }  
}

  
/**
 * Class which instances represent absence of value, similar to `null` and
 * `undefined`
 */
export class None<A> extends OptionBase<A> {
  readonly _A: A;
}


/** Contains one single value */
export class Some<A> extends OptionBase<A> {
  readonly _A: A;
  
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
    if (option instanceof None) return none;
    if (option instanceof Some) output.push(option.value);
  }
  return new Some(output);
}


// Aliases
export const none = new None<any>();
export function some<A extends Expr>(a: A): Option<A> { return new Some<A>(a); }
export { some as of };
