# Dependency Inversion Principle (DIP)

High-level policy and low-level details should meet through a contract owned at the policy boundary. Both depend on that abstraction. In TypeScript, structural typing means an implementation can satisfy the contract without explicit `implements` syntax.

## Apply it

- Identify volatile details such as database, filesystem, clock, network client, or framework code that high-level policy currently constructs or imports directly.
- Define the smallest contract the policy needs near the policy that consumes it.
- Pass the dependency into the function/module, usually as a parameter or constructor argument. Keep concrete wiring at the application composition point.
- Implement the contract with the real adapter; use a simple fake where isolation is useful.
- Avoid abstractions around stable, local details with only one implementation when the seam has no practical value.

```ts
type UserReader = {
  findById(id: string): Promise<User | undefined>;
};

async function loadUser(id: string, users: UserReader) {
  return users.findById(id);
}
```

## Check

Can policy be exercised without starting the external system? Can the concrete adapter be replaced without changing policy? Is the contract shaped by the consumer's needs?

## Sources

- [SOLID Principles in TypeScript — LLC Programming Learning Center](https://llc.taejins.com/en/typescript/ch4/solid/)
- [SOLID Principles — InterLAB](https://interlab.app/en/blog/solid)
- [TypeScript Handbook: Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html)
- [TypeScript Handbook: Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
