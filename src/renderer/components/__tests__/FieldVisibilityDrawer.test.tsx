import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { FieldVisibilityDrawer, keyToI18n } from '../FieldVisibilityDrawer';
import { FieldVisibilityContext } from '../../contexts/FieldVisibilityContext';
import { DEFAULT_FIELD_VISIBILITY, type VisibilityKey } from '../../../common/validation';
import type { FieldVisibilityMap } from '../../../common/types';

type VKey = VisibilityKey;

const mockSetVisibility = vi.fn();
const mockResetToDefaults = vi.fn();

const renderDrawer = (
  props: Partial<React.ComponentProps<typeof FieldVisibilityDrawer>> = {},
  visibilityOverrides: Partial<FieldVisibilityMap> = {}
) => {
  const visibility = { ...DEFAULT_FIELD_VISIBILITY, ...visibilityOverrides } as FieldVisibilityMap;
  return render(
    <FieldVisibilityContext.Provider
      value={{
        visibility,
        isVisible: (key: VKey) => (visibility as Record<VKey, boolean>)[key] ?? true,
        setVisibility: mockSetVisibility,
        resetToDefaults: mockResetToDefaults,
      }}
    >
      <FieldVisibilityDrawer
        isOpen={false}
        onClose={vi.fn()}
        {...props}
      />
    </FieldVisibilityContext.Provider>
  );
};

describe('FieldVisibilityDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Open / Close state ──────────────────────────────────────────────────

  it('TC-FVD-01: does not have .open class when isOpen=false', () => {
    const { container } = renderDrawer({ isOpen: false });
    const drawer = container.querySelector('.fv-drawer');
    expect(drawer).not.toHaveClass('open');
  });

  it('TC-FVD-02: has .open class when isOpen=true', () => {
    const { container } = renderDrawer({ isOpen: true });
    const drawer = container.querySelector('.fv-drawer');
    expect(drawer).toHaveClass('open');
  });

  it('TC-FVD-03: overlay is rendered only when isOpen=true', () => {
    const { container, rerender } = renderDrawer({ isOpen: false });
    expect(container.querySelector('.fv-overlay')).not.toBeInTheDocument();

    rerender(
      <FieldVisibilityContext.Provider
        value={{
          visibility: DEFAULT_FIELD_VISIBILITY as FieldVisibilityMap,
          isVisible: (key: VKey) => DEFAULT_FIELD_VISIBILITY[key as keyof typeof DEFAULT_FIELD_VISIBILITY] ?? true,
          setVisibility: mockSetVisibility,
          resetToDefaults: mockResetToDefaults,
        }}
      >
        <FieldVisibilityDrawer isOpen={true} onClose={vi.fn()} />
      </FieldVisibilityContext.Provider>
    );
    expect(container.querySelector('.fv-overlay')).toBeInTheDocument();
  });

  // ── Close triggers ──────────────────────────────────────────────────────

  it('TC-FVD-04: clicking the overlay fires onClose', () => {
    const onClose = vi.fn();
    const { container } = renderDrawer({ isOpen: true, onClose });
    fireEvent.click(container.querySelector('.fv-overlay')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('TC-FVD-05: clicking the ✕ close button fires onClose', () => {
    const onClose = vi.fn();
    renderDrawer({ isOpen: true, onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('TC-FVD-06: pressing Escape fires onClose', () => {
    const onClose = vi.fn();
    renderDrawer({ isOpen: true, onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('TC-FVD-07: Escape listener is inactive when isOpen=false', () => {
    const onClose = vi.fn();
    renderDrawer({ isOpen: false, onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  // ── Tab behaviour ───────────────────────────────────────────────────────

  it('TC-FVD-08: ledger tab is active by default (defaultTab="ledger")', () => {
    renderDrawer({ isOpen: true, defaultTab: 'ledger' });
    const ledgerTab = screen.getByRole('tab', { name: 'Ledger' });
    const cardTab   = screen.getByRole('tab', { name: 'Gallery Card' });
    expect(ledgerTab).toHaveAttribute('aria-selected', 'true');
    expect(cardTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel', { hidden: false })).toHaveAttribute('id', 'fv-panel-ledger');
  });

  it('TC-FVD-09: card tab is active when defaultTab="card"', () => {
    renderDrawer({ isOpen: true, defaultTab: 'card' });
    const cardTab   = screen.getByRole('tab', { name: 'Gallery Card' });
    const ledgerTab = screen.getByRole('tab', { name: 'Ledger' });
    expect(cardTab).toHaveAttribute('aria-selected', 'true');
    expect(ledgerTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel', { hidden: false })).toHaveAttribute('id', 'fv-panel-card');
  });

  it('TC-FVD-10: clicking the inactive tab switches the active panel', () => {
    renderDrawer({ isOpen: true, defaultTab: 'ledger' });
    fireEvent.click(screen.getByRole('tab', { name: 'Gallery Card' }));
    expect(screen.getByRole('tab', { name: 'Gallery Card' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { hidden: false })).toHaveAttribute('id', 'fv-panel-card');
  });

  // ── Toggles ─────────────────────────────────────────────────────────────

  it('TC-FVD-11: locked field toggle is disabled and does not fire setVisibility', () => {
    renderDrawer({ isOpen: true, defaultTab: 'ledger' });
    // "Title" is a locked field (ledger.title)
    const titleToggle = screen.getByRole('button', { name: 'Title' });
    expect(titleToggle).toBeDisabled();
    fireEvent.click(titleToggle);
    expect(mockSetVisibility).not.toHaveBeenCalled();
  });

  it('TC-FVD-12: toggling an unlocked OFF field calls setVisibility(key, true)', () => {
    // die_axis defaults to false — toggle it on
    renderDrawer({ isOpen: true, defaultTab: 'ledger' });
    const dieAxisToggle = screen.getByRole('button', { name: 'Die Axis' });
    expect(dieAxisToggle).not.toBeDisabled();
    fireEvent.click(dieAxisToggle);
    expect(mockSetVisibility).toHaveBeenCalledWith('ledger.die_axis', true);
  });

  it('TC-FVD-13: toggling an unlocked ON field calls setVisibility(key, false)', () => {
    // grade defaults to true — toggle it off
    renderDrawer({ isOpen: true, defaultTab: 'ledger' });
    const gradeToggle = screen.getByRole('button', { name: 'Grade' });
    expect(gradeToggle).not.toBeDisabled();
    fireEvent.click(gradeToggle);
    expect(mockSetVisibility).toHaveBeenCalledWith('ledger.grade', false);
  });

  // ── Reset ────────────────────────────────────────────────────────────────

  it('TC-FVD-14: "Reset to Defaults" button fires resetToDefaults', () => {
    renderDrawer({ isOpen: true });
    fireEvent.click(screen.getByRole('button', { name: 'Reset to Defaults' }));
    expect(mockResetToDefaults).toHaveBeenCalledTimes(1);
  });

  // ── Anchor class ─────────────────────────────────────────────────────────

  it('TC-FVD-15: drawer has fv-drawer--left class when anchor="left"', () => {
    const { container } = renderDrawer({ isOpen: true, anchor: 'left' });
    expect(container.querySelector('.fv-drawer')).toHaveClass('fv-drawer--left');
  });

  it('TC-FVD-16: drawer has fv-drawer--right class when anchor="right"', () => {
    const { container } = renderDrawer({ isOpen: true, anchor: 'right' });
    expect(container.querySelector('.fv-drawer')).toHaveClass('fv-drawer--right');
  });
});

// ── keyToI18n helper ────────────────────────────────────────────────────────

describe('keyToI18n', () => {
  it('TC-KTI-01: ledger.die_axis → dieAxis', () => {
    expect(keyToI18n('ledger.die_axis')).toBe('dieAxis');
  });

  it('TC-KTI-02: ledger.catalog_ref → catalogRef', () => {
    expect(keyToI18n('ledger.catalog_ref')).toBe('catalogRef');
  });

  it('TC-KTI-03: ledger.obverse_legend → obverseLegend', () => {
    expect(keyToI18n('ledger.obverse_legend')).toBe('obverseLegend');
  });

  it('TC-KTI-04: card.grade → cardGrade', () => {
    expect(keyToI18n('card.grade')).toBe('cardGrade');
  });

  it('TC-KTI-05: card.weight → cardWeight', () => {
    expect(keyToI18n('card.weight')).toBe('cardWeight');
  });

  it('TC-KTI-06: ledger.grade → grade (no prefix for ledger surface)', () => {
    expect(keyToI18n('ledger.grade')).toBe('grade');
  });

  it('TC-KTI-07: ledger.title → title', () => {
    expect(keyToI18n('ledger.title')).toBe('title');
  });
});
