export {
  Parser,
  ParserMethod,
  ParserState,
  UrlChunks,
  custom,
  extra,
  oneOf,
  params,
  parseImpl,
  path,
  prepareState,
  printImpl,
  segment,
  tag,
} from './parser';

import * as parser from './parser';
export { parser as parser };


export {
  Adapter,
  AdapterBase,
  HasPartialAdapter,
  HasTotalAdapter,
  NamedAdapter,
  PartialAdapter,
  PartialAndTotalAdapter,
  TotalAdapter,
  array,
  boolean,
  date,
  int,
  literals,
  nat,
  nestring,
  of,
  partialAdapter,
  partialAndTotalAdapter,
  string,
  totalAdapter,
} from './adapter';

import * as adapter from './adapter';
export { adapter as adapter };


export {
  None,
  Some,
  none,
  some,
} from './option';

import * as option from './option';
export { option as option };
