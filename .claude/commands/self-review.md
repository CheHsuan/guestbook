# Self Review

Perform a self-review checklist on the current PR before merging:

1. **No debug statements** — check for leftover `console.log`, `debugger`, or commented-out code
2. **No hardcoded secrets** — check for Firebase API keys, tokens, or credentials in code
3. **Test coverage** — verify the main logic changed has corresponding tests
4. **Scope check** — verify the PR only changes what the linked Issue requires (no unrelated edits)
5. **Tests pass** — run `npm test` — must return zero failures
6. **XSS safety** — verify any user-generated content is sanitized before rendering to DOM

Output results as a checklist:
```
- [x] No debug statements
- [x] No hardcoded secrets
- [x] Test coverage adequate
- [x] Scope matches Issue AC
- [x] npm test → all pass
- [x] XSS safety verified
```

If **all items pass**, leave a PR comment:
```
[Agent Self-Review] LGTM. All checks passed. Ready to merge.
```

If **any item fails**, fix it first, then re-run this command.
