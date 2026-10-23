# Interface Segregation Principle (ISP)

Clients should depend only on the capabilities they use. In TypeScript, a contract can be an `interface`, a type alias, a function type, or a narrow object shape; choose the form already idiomatic in the repository.

## Apply it

- Look for callers that need only part of a broad type, implementations with empty/throwing methods, and test doubles that must implement irrelevant operations.
- Split the contract along client needs, then type each caller against the smallest useful capability.
- Compose small capability types when a client genuinely needs several; do not create one interface per method without a client reason.
- Keep concrete implementations free to expose additional capabilities without requiring every consumer to know about them.

```ts
type UserReader = {
  findById(id: string): Promise<User | undefined>;
};

type UserWriter = {
  save(user: User): Promise<void>;
};
```

Read-only clients can depend on `UserReader`; a workflow that saves can depend on `UserWriter` too.

## Check

Does each client-facing contract describe only what that client needs? Can a focused fake implement it without placeholder methods?

## Sources

- [SOLID Principles in TypeScript — LLC Programming Learning Center](https://llc.taejins.com/en/typescript/ch4/solid/)
- [SOLID Principles — InterLAB](https://interlab.app/en/blog/solid)
- [TypeScript Handbook: Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html)
