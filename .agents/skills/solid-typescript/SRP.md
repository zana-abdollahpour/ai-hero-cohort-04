# Single Responsibility Principle (SRP)

Gather together code that changes for the same reason; separate code that changes for different reasons. A function, module, or class should have one cohesive responsibility, not an arbitrary line-count limit.

## Apply it

- Find unrelated change pressures in a module: for example, business rules and database mapping, or request parsing and email formatting.
- Move a responsibility only when its rules, vocabulary, or reason to change are distinct. Keep closely related steps together.
- Prefer extracting a named function or module before introducing a class. Keep data transformation separate from I/O when that improves clarity or testability.
- Keep related behavior and its data close; callers should not need to coordinate several fragments to perform one task.

```ts
function calculateInvoiceTotal(items: InvoiceItem[]): number {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}
```

Calculation has a distinct, side-effect-free responsibility and can remain a function. Do not create a `Calculator` class solely to satisfy SRP.

## Check

Can you name one coherent reason this code changes? Does extracting the responsibility reduce knowledge or change coupling at its callers? If not, keep the code together.

## Sources

- [SOLID Principles in TypeScript — LLC Programming Learning Center](https://llc.taejins.com/en/typescript/ch4/solid/)
- [SOLID Principles — InterLAB](https://interlab.app/en/blog/solid)
