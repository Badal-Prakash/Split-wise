declare const test: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: (actual: unknown) => { toEqual: (expected: unknown) => void; toThrow: () => void };
