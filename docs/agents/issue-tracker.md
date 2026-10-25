# Issue tracker: GitHub

Issues and specs for this repo live in GitHub Issues. Use the `gh` CLI for all operations. Infer the repository from the GitHub remote.

- Create: `gh issue create --title "..." --body-file <file>`
- Read: `gh issue view <number> --json number,title,body,labels,comments`
- List: `gh issue list` with appropriate state and label filters
- Comment: `gh issue comment <number> --body "..."`
- Apply or remove labels: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- Close: `gh issue close <number> --comment "..."`

PRs are not an issue intake surface for triage.
