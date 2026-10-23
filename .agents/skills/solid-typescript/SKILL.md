---
name: solid-typescript
description: Refactor TypeScript code to apply the SOLID design principles while preserving behavior and fitting the repository's existing architecture. Use when implementing SOLID, reducing coupling, splitting responsibilities, designing extension points, or reviewing TypeScript code for SRP, OCP, LSP, ISP, or DIP.
---

# SOLID in TypeScript

Apply the principle that addresses an observed change or coupling problem. SOLID is a set of design heuristics, not a requirement to add classes, interfaces, or layers everywhere. TypeScript is structurally typed; use the smallest useful type or function contract, and follow the project's existing style.

## Workflow

1. Read the relevant module, its callers, tests, and repository guidance. Identify the behavior that must remain stable and the concrete change that is difficult today.
2. Select the relevant principle reference: [SRP](SRP.md), [OCP](OCP.md), [LSP](LSP.md), [ISP](ISP.md), or [DIP](DIP.md). Load more than one only when the same change clearly involves them.
3. Make the smallest refactor that improves the seam or responsibility. Prefer cohesive functions/modules and composition; introduce an abstraction when it represents a real variation or isolates a dependency.
4. Preserve public behavior and error semantics. Update focused tests when the task calls for tests, and use the repository's documented verification commands when asked to verify.
5. Review the final diff for unnecessary indirection, duplicated behavior, weakened types, and unrelated edits. Report the design change and any remaining tradeoff.

## Decision check

- Name the change pressure before splitting a responsibility.
- Name the expected variation before adding an extension point.
- State the contract before substituting an implementation.
- Remove unused capabilities from a client-facing type.
- Put volatile details behind a contract owned by the policy that needs them.

## References

- [Single Responsibility](SRP.md)
- [Open/Closed](OCP.md)
- [Liskov Substitution](LSP.md)
- [Interface Segregation](ISP.md)
- [Dependency Inversion](DIP.md)

