---
name: do-work
description: "Plan, implement, validate, and commit a unit of work in this repository. Use when asked to complete a feature, fix, refactor, or other scoped coding task."
disable-model-invocation: true
---

# Do Work

Complete one scoped unit of repository work from plan through commit.

## Workflow

1. **Plan.** (optional) Read the relevant code and repository guidance. State a short plan with the files or behavior affected and how you will verify it. For ambiguous requirements, inspect available context and make the smallest reasonable assumption; ask only when a decision blocks correct implementation.

2. **Implement.** Make the smallest coherent change that satisfies the request. Follow nearby patterns and keep the change focused on the planned work. For backend code, work in small tracer-bullet steps: choose one thin, end-to-end slice, then complete its red-green-refactor cycle before starting the next slice. Add or update a focused test that captures the behavior (red), make the minimum implementation to pass it (green), then simplify the code while keeping the test passing (refactor). Keep each step reviewable and runnable. This red-green-refactor sequence applies only to backend implementation; do not impose it on frontend code.

3. **Get feedback.** Run `pnpm run typecheck` and `pnpm run test`. Treat compiler and test output as feedback: fix issues in the change and rerun the failing command(s). Repeat until both commands pass. If a command cannot run, report the concrete blocker and its impact; do not claim it passed.

4. **Review.** Inspect the final diff, confirm it matches the plan, and check for accidental or unrelated changes. Resolve any issues found and rerun affected checks.

5. **Commit.** Commit the completed work on the current branch with a concise, specific message. Stage only files belonging to this unit of work; preserve unrelated existing changes. If checks remain blocked, explain the status in the commit message only when committing is still appropriate, and report the limitation clearly.

6. **Report.** Summarize the change, the check results, and the commit hash.

## Completion criteria

The unit is complete when the requested behavior is implemented, the final diff has been reviewed, both repository checks pass (or a blocker is clearly reported), and the work has a commit on the current branch.
