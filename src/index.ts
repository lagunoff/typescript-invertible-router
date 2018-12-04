export {
  Parser,
  custom,
  extra,
  oneOf,
  params,
  path,
  segment,
  embed,
  tag,
} from './parser';

import * as parser from './parser';
export { parser as parser };


export {
  Adapter,
  AdapterBase,
  NamedAdapter,
  CustomAdapter,
  HasAdapter,
  array,
  boolean,
  date,
  int,
  literals,
  nat,
  nestring,
  of,
  string,
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
