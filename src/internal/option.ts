import { Expr } from './expr';


/// adt
export type Option<a> = None<a> | Some<a>
export type Maybe<a> = Option<a>


/// instance method for convenience
export class OptionBase<A> {
  readonly _A: A;

  /// map
  map<B>(f: (a: A) => B): Option<B> {
    const $this = this as any as Option<A>;
    switch ($this.tag) {
      case 'None': return $this as any;
      case 'Some': return new Some(f($this.value));
    }
  }

  /// chain
  chain<B>(f: (a: A) => Option<B>): Option<B> {
    const $this = this as any as Option<A>;
    switch ($this.tag) {
      case 'None': return $this as any;
      case 'Some': return f($this.value);
    }
  }

  /// unwrap
  unwrap<B extends Expr, C extends Expr>(fromNone: B, fromSome: (x: A) => C): B|C {
    const $this = this as any as Option<A>;
    switch ($this.tag) {
      case 'None': return fromNone;
      case 'Some': return fromSome($this.value);
    }
  }

  /// withDefault
  withDefault<B extends Expr>(def: B): A|B {
    return this.unwrap(def, x => x);
  }
  
}

  
/// empty container
export class None<A> extends OptionBase<A> {
  readonly _A: A;
  readonly tag: 'None' = 'None';
}


/// container with a value
export class Some<A> extends OptionBase<A> {
  readonly _A: A;
  readonly tag: 'Some' = 'Some';
  constructor(
    readonly value: A,
  ) { super(); }
}


/// traverse an array
export function traverse<A, B>(arr: Array<A>, f: (a: A) => Option<B>): Option<B[]> {
  const output = [] as B[];
  for (let i in arr) {
    const option = f(arr[i]);
    switch (option.tag) {
      case 'None': return option as any;
      case 'Some': output.push(option.value); break;
    }
  }
  return new Some(output);
}


/// aliases
export const none = new None<any>();
export function some<A extends Expr>(a: A): Option<A> { return new Some<A>(a); }
export { some as of };