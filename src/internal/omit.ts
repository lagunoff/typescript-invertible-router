/// Utilies types based on
/// https://github.com/Microsoft/TypeScript/issues/12215#issuecomment-307871458
export type Diff<T extends string, U extends string> = ({ [P in T]: P } &
  { [P in U]: never } & { [x: string]: never })[T];
export type Omit<T, K extends keyof T> = Pick<T, Diff<keyof T, K>>;
