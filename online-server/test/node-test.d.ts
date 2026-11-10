// Testlerin kullandığı node:test ve node:assert/strict parçalarının elle yazılmış tipleri (@types/node kurulmaz).

declare module "node:test" {
  function test(name: string, fn: () => void | Promise<void>): Promise<void>;
  function test(name: string, secenek: { todo?: string | boolean; skip?: string | boolean }, fn: () => void | Promise<void>): Promise<void>;
  export default test;
}

declare module "node:assert/strict" {
  interface Assert {
    ok(value: unknown, message?: string): asserts value;
    equal(actual: unknown, expected: unknown, message?: string): void;
    notEqual(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    match(value: string, pattern: RegExp, message?: string): void;
    doesNotMatch(value: string, pattern: RegExp, message?: string): void;
    rejects(block: Promise<unknown>, error?: (e: unknown) => boolean, message?: string): Promise<void>;
  }
  const assert: Assert;
  export default assert;
}

declare module "node:fs" {
  export function readdirSync(yol: string): string[];
  export function readFileSync(yol: string, kodlama: "utf8"): string;
  export function statSync(yol: string): { isDirectory(): boolean };
}

declare module "node:path" {
  export function join(...parcalar: string[]): string;
}

interface ImportMeta {
  readonly url: string;
}
