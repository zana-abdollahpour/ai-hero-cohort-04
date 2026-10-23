# Liskov Substitution Principle (LSP)

Any implementation accepted by a contract must work wherever that contract is expected, without surprising callers or breaking documented behavior. Type compatibility alone cannot prove behavioral substitutability.

## Apply it

- Define the contract in terms of valid inputs, outputs, errors, side effects, and invariants.
- Ensure implementations accept at least the inputs promised by the contract, return the promised results, and preserve its invariants.
- Do not make a subtype reject valid base inputs, strengthen preconditions, weaken postconditions, or add unexpected failures.
- Prefer composition or separate types when a subtype cannot honor the parent behavior. Do not force unrelated variants into an inheritance tree.
- Use behavioral tests against each implementation where substitution matters; compile-time assignability is necessary but not sufficient.

## Check

Can a caller use each implementation without checking its concrete type or handling undocumented special cases? Do tests assert the contract rather than implementation details?

## Sources

- [SOLID Principles in TypeScript — LLC Programming Learning Center](https://llc.taejins.com/en/typescript/ch4/solid/)
- [SOLID Principles — InterLAB](https://interlab.app/en/blog/solid)
- [TypeScript Handbook: Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
