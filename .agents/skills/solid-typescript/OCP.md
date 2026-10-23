# Open/Closed Principle (OCP)

A module should allow the expected kinds of extension without requiring repeated edits to stable policy code. OCP does not mean existing code can never change; it means changes should be localized where variation belongs.

## Apply it

- Find a recurring or explicitly expected variation, such as pricing rules, export formats, or notification providers.
- Keep the stable policy in one place and represent variation with a small function/object contract or a discriminated union when the alternatives are closed and known.
- Add a new implementation at the variation point; avoid spreading a growing `switch` across callers.
- Keep a simple conditional when there is only one case or no demonstrated likelihood of another. A speculative plugin framework is not an improvement.

```ts
type Discount = (subtotal: number) => number;

function totalAfterDiscount(subtotal: number, discount: Discount): number {
  return subtotal - discount(subtotal);
}
```

## Check

Can a real new variant be added in one focused place while stable policy remains unchanged? Is the extension contract smaller than the conditionals it replaces?

## Sources

- [SOLID Principles in TypeScript — LLC Programming Learning Center](https://llc.taejins.com/en/typescript/ch4/solid/)
- [SOLID Principles — InterLAB](https://interlab.app/en/blog/solid)
- [TypeScript Handbook: Function Types](https://www.typescriptlang.org/docs/handbook/interfaces.html#function-types)
