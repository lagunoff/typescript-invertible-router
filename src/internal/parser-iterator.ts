import { Parser, Merge } from '../parser';


/**
 * Iterative tree traversal as described
 * https://www.geeksforgeeks.org/iterative-postorder-traversal-using-stack/
 */
export default function* makeIterator<O, I>(parser: Parser<O, I>): IterableIterator<Parser<O, I>> {
  let root: Parser<O, I>|null = parser;
  const stack: Array<Parser<O, I>|null> = [];
  do {
    while (root !== null) {
      stack.push(right(root));
      stack.push(root);
      root = left(root);
    }
    root = stack.pop() || null;
    if (root && right(root) === last(stack)) {
      stack.pop();
      stack.push(root);
      root = right(root);
    } else {
      if (root) {
        if (!(root instanceof Merge)) yield root;
        root = null;
      }
    }
  } while (stack.length !== 0);

  function last<A>(xs: A[]): A {
    return xs[xs.length - 1];
  }

  function left<O, I>(parser: Parser<O, I>): Parser<O, I>|null {
    return parser instanceof Merge ? parser._first : null;
  }

  function right<O, I>(parser: Parser<O, I>): Parser<O, I>|null {
    return parser instanceof Merge ? parser._second : null;
  }
}



// import { traverseParsers } from '../parser';
// import * as r from '../';

// const a = 'none',b='none',c='none';
// const ex1 = r.tag('Home').extra({ a }).path('/home').extra({ b }).path('/contacts').extra({ c });
// const iter = makeIterator(ex1._value);
// do {
//   const { value, done } = iter.next(); if (done) break;
//   console.log('value', value);
// } while (1);
