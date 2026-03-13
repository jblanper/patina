# Engineering Standards: Testing Strategy

**Version:** 1.0  
**Last Updated:** 2026-03-13  
**Status:** Active

This document resolves the ambiguity in `GEMINI.md` regarding test structure and defines the mandatory testing patterns for the Patina project.

---

## 1. Core Philosophy
-   **Validation is Mandatory:** No feature is complete until verified by an automated test.
-   **Component-Focused:** Tests should live as close to the code as possible (Colocation).
-   **No Flakes:** Flaky tests are worse than no tests. Use `vi.useFakeTimers()` for time-dependent logic.

---

## 2. Technology Stack

| Tool | Purpose | Configuration |
| :--- | :--- | :--- |
| **Vitest** | Test Runner | Configured in `vite.config.ts`. Supports ESM natively. |
| **React Testing Library** | Component Rendering | Use `@testing-library/react` (v16+). |
| **JSDOM** | Browser Environment | Simulates DOM API for React components. |
| **Vi** | Mocking | Built-in Vitest mocking utility (`vi.fn`, `vi.spyOn`). |

---

## 3. Directory Structure (The "Colocation" Rule)

We have formally adopted the **Colocation Strategy** for unit tests to support our modular architecture.

### 3.1 Unit Tests (Colocated)
Place test files directly next to the source file they test.

```text
src/
├── renderer/
│   ├── components/
│   │   ├── CoinCard.tsx
│   │   ├── CoinCard.test.tsx      <-- Component Test
│   ├── hooks/
│   │   ├── useCoins.ts
│   │   ├── __tests__/             <-- Hooks can use a nested folder if multiple files needed
│   │   │   └── useCoins.test.ts
```

### 3.2 Integration Tests
Tests that span multiple modules or processes belong in the centralized root:
`src/__tests__/integration/`

---

## 4. Coverage Mandates

Run coverage via `npm run test -- --coverage`.

1.  **Security Critical:** `src/common/validation.ts`
    -   **Target:** 100% Branch Coverage.
    -   **Rationale:** This file is "The Filter". Any gap here is a security vulnerability.
2.  **Business Logic:** `src/renderer/hooks/`
    -   **Target:** 90% Function Coverage.
    -   **Rationale:** Hooks contain the core data manipulation and filtering logic.
3.  **UI Components:** `src/renderer/components/`
    -   **Target:** 80% Statement Coverage.
    -   **Rationale:** Verify rendering states (loading, error, data) but avoid testing CSS implementation details.

---

## 5. Standard Patterns

### 5.1 Testing Custom Hooks
Use `renderHook` to test hooks in isolation.

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCoins } from '../useCoins';

it('should filter coins', async () => {
  const { result } = renderHook(() => useCoins());
  
  // Use act() for state updates
  act(() => {
    result.current.updateFilters({ era: ['Ancient'] });
  });
  
  expect(result.current.filteredCoins).toHaveLength(1);
});
```

### 5.2 Mocking Electron API
Since `window.electronAPI` is undefined in the test environment, you MUST mock it in `setupTests.ts` or `beforeEach`.

```typescript
// setupTests.ts
global.window.electronAPI = {
  getCoins: vi.fn(),
  addCoin: vi.fn(),
  // ... mock all methods
};

// In test file
import { vi } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
  (window.electronAPI.getCoins as any).mockResolvedValue(MOCK_DATA);
});
```

### 5.3 Asynchronous Testing
Always use `waitFor` or `findBy*` queries when asserting on async state changes (like data fetching).

```typescript
// Good
expect(await screen.findByText('Athens Owl')).toBeInTheDocument();

// Bad (Race condition)
// expect(screen.getByText('Athens Owl')).toBeInTheDocument();
```

---

## 6. Snapshot Policy
-   **Use Sparingly:** Only for "dumb" UI components with complex DOM structures (e.g., `CoinCard`).
-   **Avoid for Logic:** Never use snapshots for hooks or functions. Assert specific values instead.
-   **Commit:** Snapshot files must be committed to git.
