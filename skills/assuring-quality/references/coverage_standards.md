# Coverage Standards

Detailed metrics and requirements for code coverage in the Patina project.

## 1. Coverage Thresholds

| Scope | Category | Minimum Target | Rationale |
| :--- | :--- | :--- | :--- |
| **Security Validation** | `src/common/validation.ts` | 100% Branch Coverage | The "Filter" layer is critical. Every validation path must be tested to prevent bypasses. |
| **Business Logic** | `src/renderer/hooks/` | 90% Function Coverage | Hooks contain the core logic for state management and data filtering. |
| **UI Components** | `src/renderer/components/` | 80% Statement Coverage | Ensures all components render correctly in multiple states (loading, data, error). |

## 2. Generating Reports
Run the following command to generate the coverage report:

```bash
npm run test -- --coverage
```

The report will be generated in the `coverage/` directory. Open `coverage/index.html` in a browser to see the detailed breakdown.

## 3. Interpreting Reports
- **Statement Coverage:** Has each line in the source code been executed?
- **Branch Coverage:** Has each branch of each control structure (e.g., if statements, switch/case) been executed?
- **Function Coverage:** Has each function (or method) in the source code been called?

## 4. Addressing Gaps
If coverage falls below the target:
1. Identify the untested paths in the coverage report.
2. Add new test cases to the corresponding colocated test file (`*.test.ts`).
3. Re-run coverage to verify the improvement.
4. **DO NOT** use `/* v8 ignore next */` unless the code is truly unreachable or platform-specific.
