# Agent Instructions & Security Rules

When acting as an AI assistant within this project, you must strictly adhere to the following rules to maintain security and consistency:

## Privacy & Local Paths
- **Never expose local host paths**: You operate within a specific user's file system, but the artifacts you produce (like workflows, documentations, code, or configuration files) may be pushed to a public source control like GitHub. **Do not** hardcode absolute machine paths (e.g., `/Users/username/...` or `C:\Users\...`). 
- Whenever commands, file paths, or working directories are documented or scripted, use **relative paths** (`./`) or assume the project root as the default working directory.

## Secrets Management
- Do not commit or hardcode confidential API keys, database credentials, or tokens in source files or configuration templates. 
- Exception: Frontend client SDK configurations (such as Firebase's `firebaseConfig`) that are meant to be strictly public are acceptable, provided that the data access operations are governed and secured by backend rules (e.g., `database.rules.json`).

## Workflow Execution
- When using `run_command` in an automated workflow (i.e. parsing an `.agent/workflows/*.md` file), you should explicitly set the `Cwd` parameter to point to the repository root instead of assuming or hardcoding the `cd` commands inside the script lines themselves.
