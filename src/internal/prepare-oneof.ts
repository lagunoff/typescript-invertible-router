import { Parser, Merge, Path } from '../parser';


type Result<O, I> = {
  paths: Path<O, I>[];
  rest: Parser<O, I>|null;
  done: boolean;
};


export default function prepareOneOf<O, I>(parser: Parser<O, I>): Parser<O, I> {
  return joinResult(go(parser));
  
  function go(parser: Parser<O, I>): Result<O, I> {
    switch(parser.tag) {
      case 'Path': return { paths: [parser], rest: null, done: false };
      case 'Segment': return { paths: [], rest: parser, done: true };
      case 'Merge': {
        const first = go(parser.first); if (first.done) return { paths: [], rest: new Merge(joinResult(first), parser.second), done: true };
        const second = go(parser.second);
        const rest: Parser<O, I>|null = first.rest && second.rest ? new Merge(first.rest, second.rest) : first.rest || second.rest || null;
        return { paths: [...first.paths, ...second.paths], rest, done: first.done || second.done };
      }
      default: return { paths: [], rest: parser, done: false };
    }
  }

  function fromArray<O, I>(parsers: Parser<O, I>[]): Parser<O, I> {
    return parsers.reduce((acc, x) => new Merge(acc, x));
  }

  function joinResult<O, I>(result: Result<O, I>): Parser<O, I> {
    return result.paths.length && result.rest ? new Merge(fromArray(result.paths), result.rest) : result.paths.length ? fromArray(result.paths) : result.rest!;
  }
}

// import { traverseParsers } from '../parser';
// import * as r from '../';

// const a = 'none',b='none',c='none';
// const ex1 = r.tag('Home').extra({ a }).path('/home').extra({ b }).path('/contacts').extra({ c });

// const log = (...args) => console.log.apply(console, args)// .map(x => JSON.stringify(x, null, 2)));
// // @ts-ignore
// const toArray = (parser) => { const xs = []; traverseParsers(parser, x => xs.push(x)); return xs; };
// log(toArray(ex1._value));
// log(toArray(prepareOneOf(ex1._value)));


// const ex2 = r.tag('Home').segment('id', r.nestring).extra({ a }).path('/home').extra({ b }).path('/contacts').extra({ c });

// log(toArray(ex2._value));
// log(toArray(prepareOneOf(ex2._value)));
