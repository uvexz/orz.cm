declare module "bun:test" {
  type MaybePromise<T = void> = T | Promise<T>;
  type TestCallback = () => MaybePromise;

  interface Matchers {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toThrow(expected?: string | RegExp | Error): void;
    toBeInstanceOf(expected: new (...args: never[]) => unknown): void;
  }

  interface Expectation extends Matchers {
    not: Matchers;
  }

  export function describe(name: string, fn: TestCallback): void;
  export function it(name: string, fn: TestCallback): void;
  export function beforeEach(fn: TestCallback): void;
  export function afterAll(fn: TestCallback): void;
  export function expect(received: unknown): Expectation;

  export const mock: {
    module(
      specifier: string,
      factory: () => Record<string, unknown>,
    ): void;
  };
}
