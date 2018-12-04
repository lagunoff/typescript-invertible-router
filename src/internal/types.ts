/** For better type inference */
export type Expr = boolean|null|undefined|number|string|{}|any[]|[any,any]|[any,any,any]|Function


/** Helper for totality checking */
export function absurd(x: never): any {
  throw new Error('absurd: unreachable code');
}
