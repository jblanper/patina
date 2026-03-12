# AGENTS.md

## 1. Build/lint/test commands
- **Build**: `npm run build --silent` (uses Next.js optimization)
- **Lint**: `npm run lint -- --fix` (auto-fixes style violations)
- **Test**: `npm test -- --testNamePattern=".*feature.*"` (runs specific tests)
- **Single test**: `npm test -- --runTestsByPath "/Users/joseblancoperales/code/patina/src/features/dashboard/Widget.test.tsx"`

## 2. Code style guidelines
- **Imports**: 
  - Sorted alphabetically (`import { useState } from "react"`)
  - Avoid `import *` unless required
  - Group by type: React, external, internal, others
- **Formatting**: 
  - 2-space indentation (1-space is only for legacy scripts)
  - No trailing whitespace
  - 80-character max line length (auto-enforced by Prettier)
- **Type Safety**: 
  - Mandatory TypeScript (`"typescript": true` in tsconfig.json)
  - Strict null checks (`configure.strictNullChecks: true`)
  - No `any` types (enforce via ESLint rule `@typescript-eslint/no-explicit-any`)
- **Naming**: 
  - Components: PascalCase (`const Button = () => {...}`)
  - Variables/Functions: camelCase (`const calculateTotal`)
  - Constants: SCREAMING_SNAKE_CASE (`const MAX_USERS = 100`)
- **Error Handling**: 
  - Always use `try/catch` for async operations
  - Throw with descriptive messages (`throw new Error("API rate limit exceeded")`)
  - No silent failures (empty `catch` blocks are prohibited)

## 3. Testing Requirements
- 100% branch coverage (enforced via PR checks)
- Unit tests for all new features (min 80% coverage)
- Integration tests for critical paths (e.g., checkout flow)

## 4. Emergency Fix Protocol
1. Create temporary branch `fix/URGENT-[issue-number]`
2. Implement fix using only `edit` tool (no refactors)
3. Push to PR with `[URGENT]` prefix in title
4. Notify team in Slack channel `#urgent-fixes`

---
*Last updated: Thu Mar 12 2026*