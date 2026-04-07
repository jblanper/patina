import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { CoinCard } from '../CoinCard';
import { FieldVisibilityContext } from '../../contexts/FieldVisibilityContext';
import { DEFAULT_FIELD_VISIBILITY, type VisibilityKey } from '../../../common/validation';
import type { FieldVisibilityMap, CoinWithPrimaryImage } from '../../../common/types';

const mockCoin: CoinWithPrimaryImage = {
  id: 1,
  title: 'Test Aureus',
  era: 'Ancient',
  metal: 'Gold',
  weight: 7.98,
  diameter: 20.5,
  grade: 'VF',
  created_at: '2023-01-01',
  primary_image_path: undefined,
};

const renderCard = (
  visibilityOverrides: Partial<FieldVisibilityMap> = {},
  coinOverrides: Partial<CoinWithPrimaryImage> = {}
) => {
  const visibility = { ...DEFAULT_FIELD_VISIBILITY, ...visibilityOverrides } as FieldVisibilityMap;
  return render(
    <FieldVisibilityContext.Provider
      value={{
        visibility,
        isVisible: (key: VisibilityKey) => (visibility as Record<VisibilityKey, boolean>)[key] ?? true,
        setVisibility: vi.fn(),
        resetToDefaults: vi.fn(),
      }}
    >
      <CoinCard coin={{ ...mockCoin, ...coinOverrides }} onClick={vi.fn()} />
    </FieldVisibilityContext.Provider>
  );
};

describe('CoinCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Grade badge visibility ───────────────────────────────────────────────

  it('TC-CC-01: renders .coin-grade-row when card.grade=true and coin.grade is present', () => {
    const { container } = renderCard({ 'card.grade': true });
    expect(container.querySelector('.coin-grade-row')).toBeInTheDocument();
    expect(container.querySelector('.coin-grade-value')).toHaveTextContent('VF');
  });

  it('TC-CC-02: does not render .coin-grade-row when card.grade=false', () => {
    const { container } = renderCard({ 'card.grade': false });
    expect(container.querySelector('.coin-grade-row')).not.toBeInTheDocument();
  });

  it('TC-CC-03: does not render .coin-grade-row when coin.grade is null/undefined', () => {
    const { container } = renderCard({ 'card.grade': true }, { grade: undefined });
    expect(container.querySelector('.coin-grade-row')).not.toBeInTheDocument();
  });

  // ── Always-visible fields ────────────────────────────────────────────────

  it('TC-CC-04: always renders metal regardless of card.metal visibility flag', () => {
    // card.metal is a locked field — always rendered
    const { container } = renderCard({ 'card.metal': false });
    expect(container.querySelector('.metric-metal')).toBeInTheDocument();
    expect(container.querySelector('.metric-metal')).toHaveTextContent('Gold');
  });

  it('TC-CC-05: always renders weight', () => {
    const { container } = renderCard();
    expect(container.querySelector('.metric-weight')).toBeInTheDocument();
    expect(container.querySelector('.metric-weight')).toHaveTextContent('7.98g');
  });

  it('TC-CC-06: always renders diameter', () => {
    const { container } = renderCard();
    expect(container.querySelector('.metric-diameter')).toBeInTheDocument();
    expect(container.querySelector('.metric-diameter')).toHaveTextContent('20.5mm');
  });

  // ── Card structure ───────────────────────────────────────────────────────

  it('TC-CC-07: renders coin title', () => {
    renderCard();
    expect(screen.getByText('Test Aureus')).toBeInTheDocument();
  });

  it('TC-CC-08: renders placeholder when no primary image', () => {
    const { container } = renderCard();
    expect(container.querySelector('.coin-placeholder')).toBeInTheDocument();
  });

  it('TC-CC-09: fires onClick with coin id when card is clicked', () => {
    const onClick = vi.fn();
    const visibility = DEFAULT_FIELD_VISIBILITY as FieldVisibilityMap;
    render(
      <FieldVisibilityContext.Provider
        value={{
          visibility,
          isVisible: (key: VisibilityKey) => (visibility as Record<VisibilityKey, boolean>)[key] ?? true,
          setVisibility: vi.fn(),
          resetToDefaults: vi.fn(),
        }}
      >
        <CoinCard coin={mockCoin} onClick={onClick} />
      </FieldVisibilityContext.Provider>
    );
    fireEvent.click(screen.getByRole('article'));
    expect(onClick).toHaveBeenCalledWith(1);
  });

  it('TC-CC-10: fires onClick on Enter keydown', () => {
    const onClick = vi.fn();
    const visibility = DEFAULT_FIELD_VISIBILITY as FieldVisibilityMap;
    const { getByRole } = render(
      <FieldVisibilityContext.Provider
        value={{
          visibility,
          isVisible: (key: VisibilityKey) => (visibility as Record<VisibilityKey, boolean>)[key] ?? true,
          setVisibility: vi.fn(),
          resetToDefaults: vi.fn(),
        }}
      >
        <CoinCard coin={mockCoin} onClick={onClick} />
      </FieldVisibilityContext.Provider>
    );
    fireEvent.keyDown(getByRole('article'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledWith(1);
  });

  it('TC-CC-11: fires onClick on Space keydown', () => {
    const onClick = vi.fn();
    const visibility = DEFAULT_FIELD_VISIBILITY as FieldVisibilityMap;
    const { getByRole } = render(
      <FieldVisibilityContext.Provider
        value={{
          visibility,
          isVisible: (key: VisibilityKey) => (visibility as Record<VisibilityKey, boolean>)[key] ?? true,
          setVisibility: vi.fn(),
          resetToDefaults: vi.fn(),
        }}
      >
        <CoinCard coin={mockCoin} onClick={onClick} />
      </FieldVisibilityContext.Provider>
    );
    fireEvent.keyDown(getByRole('article'), { key: ' ' });
    expect(onClick).toHaveBeenCalledWith(1);
  });

  // ── Multi-select (CAB-A) ─────────────────────────────────────────────────

  it('TC-CC-SEL-01: card checkbox is rendered when selectable=true', () => {
    const { container } = renderCard({}, {});
    // Re-render with selectable prop
    const visibility = DEFAULT_FIELD_VISIBILITY as FieldVisibilityMap;
    const { container: c } = render(
      <FieldVisibilityContext.Provider
        value={{
          visibility,
          isVisible: (key: VisibilityKey) => (visibility as Record<VisibilityKey, boolean>)[key] ?? true,
          setVisibility: vi.fn(),
          resetToDefaults: vi.fn(),
        }}
      >
        <CoinCard coin={mockCoin} onClick={vi.fn()} selectable={true} />
      </FieldVisibilityContext.Provider>
    );
    expect(c.querySelector('.card-checkbox-wrapper')).toBeInTheDocument();
    expect(c.querySelector('input[type="checkbox"]')).toBeInTheDocument();
    void container; // suppress unused var
  });

  it('TC-CC-SEL-02: card checkbox is absent when selectable=false (default)', () => {
    const { container } = renderCard();
    expect(container.querySelector('.card-checkbox-wrapper')).not.toBeInTheDocument();
  });

  it('TC-CC-SEL-03: coin-card--selected class applied when isSelected=true', () => {
    const visibility = DEFAULT_FIELD_VISIBILITY as FieldVisibilityMap;
    const { container } = render(
      <FieldVisibilityContext.Provider
        value={{
          visibility,
          isVisible: (key: VisibilityKey) => (visibility as Record<VisibilityKey, boolean>)[key] ?? true,
          setVisibility: vi.fn(),
          resetToDefaults: vi.fn(),
        }}
      >
        <CoinCard coin={mockCoin} onClick={vi.fn()} selectable isSelected />
      </FieldVisibilityContext.Provider>
    );
    expect(container.querySelector('.coin-card--selected')).toBeInTheDocument();
  });

  it('TC-CC-SEL-04: clicking checkbox calls onToggleSelect; clicking card body calls onClick', () => {
    const onClick = vi.fn();
    const onToggleSelect = vi.fn();
    const visibility = DEFAULT_FIELD_VISIBILITY as FieldVisibilityMap;
    const { container } = render(
      <FieldVisibilityContext.Provider
        value={{
          visibility,
          isVisible: (key: VisibilityKey) => (visibility as Record<VisibilityKey, boolean>)[key] ?? true,
          setVisibility: vi.fn(),
          resetToDefaults: vi.fn(),
        }}
      >
        <CoinCard coin={mockCoin} onClick={onClick} selectable onToggleSelect={onToggleSelect} />
      </FieldVisibilityContext.Provider>
    );
    const checkbox = container.querySelector('input[type="checkbox"]')!;
    fireEvent.click(checkbox);
    expect(onToggleSelect).toHaveBeenCalled();

    fireEvent.click(container.querySelector('.coin-card')!);
    expect(onClick).toHaveBeenCalledWith(1);
  });
});
