export {
  ParserState,
  UrlChunks,
  prepareState,
  printChunks,
  Parser,
  ParserChain,
  oneOf,
  tag,
  params,
  segment,
  path,
  extra,
} from './src/parser';

import * as parser from './src/parser';
export { parser as parser };


export {
  Adapter,
  PartialAdapter,
  TotalAdapter,
  PartialAndTotalAdapter,
  NamedAdapter,
  AdapterBase,
  HasTotalAdapter,
  HasPartialAdapter,
  string,
  nestring,
  nat,
  int,
  date,
  boolean,
  array,
  literals,
  of,
} from './src/adapter';

import * as adapter from './src/adapter';
export { adapter as adapter };
