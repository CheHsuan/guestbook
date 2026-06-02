# Create Bug Issue

Create a GitHub Issue for an automatically detected bug.

Arguments: `$ARGUMENTS` — format: `"error description | caused by Issue #N"`

Steps:

1. Parse the error description and original Issue number from `$ARGUMENTS`
2. Create a GitHub issue using `gh issue create`:
   - **Title:** `[Auto-Bug] {error description} (caused by Issue #N)`
   - **Body:**
     ```
     ## Bug Report (Auto-generated)

     **Caused by:** Issue #N
     **Detected at:** {Phase N — stage name}
     **Detected on:** {date}

     ## Error Summary
     {error description}

     ## Error Log
     {paste relevant error log here}

     ## Suggested Fix
     {Claude's analysis of likely cause}
     ```
   - **Labels:** `bug`, `auto-generated`, `ready-for-dev`

3. Comment on the original Issue #N:
   `[Agent] 自動建立 Bug Issue：#{new_issue_number} — {error description}`
