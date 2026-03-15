# Changelog: Phase 3 - The Ledger Completion

**Date:** 2026-03-14
**Author:** Gemini CLI
**Status:** Complete

## Overview
Implemented the "Ledger" view (Coin Detail page), completing Phase 3 of the Patina roadmap. This update introduces a dedicated archival record view for each coin, adhering to the "Curator-First" philosophy and "Archival Ledger" aesthetic.

## Changes

### 1. New Features
- **Coin Detail View (`CoinDetail.tsx`):** Implemented the "Open Book" layout with:
  - **The Plate:** High-fidelity image display with a zoom modal.
  - **The Record:** Structured historical and physical data (Weight, Diameter, Mint, etc.).
  - **The Story:** Rich text sections for curator notes and provenance.
- **Client-Side Routing:** Integrated `react-router-dom` with `HashRouter` to manage navigation between the Gallery (`/`) and Coin Detail (`/coin/:id`).
- **Secure Image Protocol:** implemented `patina-img://` custom protocol in the Main process to serve local images securely and efficiently.

### 2. Architectural Updates
- **Component Restructuring:**
  - Extracted the main dashboard logic from `App.tsx` into a new `Cabinet.tsx` component.
  - Updated `App.tsx` to serve as the routing root.
- **New Hook:** Created `useCoin(id)` hook for encapsulated data fetching and error handling.

### 3. Styling
- Added `CoinDetail` specific styles to `src/renderer/styles/index.css`, implementing the "Archival Ledger" aesthetic (typography, spacing, colors).

### 4. Quality Assurance
- **Tests:**
  - `src/renderer/hooks/__tests__/useCoin.test.ts`: Verified data fetching, error handling, and loading states.
  - `src/renderer/components/__tests__/CoinDetail.test.tsx`: Verified rendering, user interactions (zoom, navigation), and empty states.
- **Verification:** Passed all unit tests and full build (Renderer + Main).

## Technical Details
- **Dependencies:** Added `react-router-dom`.
- **Security:**
  - `patina-img://` protocol includes path sanitization to prevent directory traversal.
  - `useCoin` hook validates input IDs before API calls.

## Next Steps
- Proceed to Phase 4 (if defined) or further refinement of the "Lens" bridge integration.
