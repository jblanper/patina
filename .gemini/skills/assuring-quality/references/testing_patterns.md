# Testing Patterns

Detailed standards for mocking and testing in the Patina environment.

## 1. Mocking Electron API
In the Renderer process, you MUST mock `window.electronAPI` to avoid "cannot read property of undefined" errors during tests.

```typescript
// Define in a local test file or a global setup
global.window.electronAPI = {
  getCoins: vi.fn(),
  addCoin: vi.fn(),
  updateCoin: vi.fn(),
  deleteCoin: vi.fn(),
};

// Example usage in a test:
import { vi } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
  (window.electronAPI.getCoins as any).mockResolvedValue([MOCK_COIN]);
});
```

## 2. Testing Custom Hooks
Use `renderHook` and `act` to test hooks with state changes.

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCoins } from '../useCoins';

it('should handle filter updates', async () => {
  const { result } = renderHook(() => useCoins());
  
  await act(async () => {
    result.current.updateFilters({ era: ['Ancient'] });
  });
  
  expect(result.current.filteredCoins).toHaveLength(1);
});
```

## 3. Asynchronous Rendering
Always use `findBy*` or `waitFor` for UI assertions that depend on async data.

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { GalleryGrid } from './GalleryGrid';

it('should display coins after loading', async () => {
  render(<GalleryGrid />);
  
  // Good: Wait for the element to appear
  const coin = await screen.findByText('Athens Owl');
  expect(coin).toBeInTheDocument();
  
  // Or: Use waitFor for more complex conditions
  await waitFor(() => {
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });
});
```
