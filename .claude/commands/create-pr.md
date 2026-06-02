# Create PR

Please create a pull request for the current branch:

1. Verify you are NOT on `main` branch — if you are, stop and ask which branch to use
2. Extract the Issue number from the branch name (e.g. `feat/issue-42-...` → `#42`)
3. Run `npm test` — fix any test failures before proceeding
4. Create PR using `gh pr create`:
   - Title: `[Issue #N] {short description}`
   - Body:
     ```
     Closes #N

     ## Changes
     {summary of what was changed and why}

     ## How to Test
     {steps to verify the feature/fix works}
     ```
5. Comment on the linked issue:
   `[Agent] Phase 2 完成。PR: {PR_URL} 分支：{branch_name}`
