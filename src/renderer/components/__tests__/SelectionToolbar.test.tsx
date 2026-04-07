import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { SelectionToolbar } from '../SelectionToolbar';

const defaultProps = {
  count: 3,
  onBulkEdit: vi.fn(),
  onBulkDelete: vi.fn(),
  onExportZip: vi.fn(),
  onExportPdf: vi.fn(),
  onClearSelection: vi.fn(),
};

describe('SelectionToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-ST-01: renders count label correctly', () => {
    render(<SelectionToolbar {...defaultProps} />);
    expect(screen.getByText(/3 selected/i)).toBeInTheDocument();
  });

  it('TC-ST-02: onClearSelection called on clear button click', () => {
    render(<SelectionToolbar {...defaultProps} />);
    const clearBtn = screen.getByRole('button', { name: /clear selection/i });
    fireEvent.click(clearBtn);
    expect(defaultProps.onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('TC-ST-03: onBulkEdit called when "Edit field" clicked inside Actions dropdown', () => {
    render(<SelectionToolbar {...defaultProps} />);
    const trigger = screen.getByRole('button', { name: /actions/i });
    fireEvent.click(trigger);
    const editBtn = screen.getByRole('menuitem', { name: /edit field/i });
    fireEvent.click(editBtn);
    expect(defaultProps.onBulkEdit).toHaveBeenCalledTimes(1);
  });

  it('TC-ST-04: onBulkDelete called when "Delete selection" clicked inside Actions dropdown', () => {
    render(<SelectionToolbar {...defaultProps} />);
    const trigger = screen.getByRole('button', { name: /actions/i });
    fireEvent.click(trigger);
    const deleteBtn = screen.getByRole('menuitem', { name: /delete selection/i });
    fireEvent.click(deleteBtn);
    expect(defaultProps.onBulkDelete).toHaveBeenCalledTimes(1);
  });

  it('TC-ST-05: Actions dropdown contains all four bulk actions', () => {
    render(<SelectionToolbar {...defaultProps} />);
    const trigger = screen.getByRole('button', { name: /actions/i });
    fireEvent.click(trigger);

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /edit field/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /delete selection/i })).toBeInTheDocument();

    const zipBtn = screen.getByRole('menuitem', { name: /export archive/i });
    fireEvent.click(zipBtn);
    expect(defaultProps.onExportZip).toHaveBeenCalledTimes(1);

    // Reopen dropdown
    fireEvent.click(trigger);
    const pdfBtn = screen.getByRole('menuitem', { name: /generate catalog/i });
    fireEvent.click(pdfBtn);
    expect(defaultProps.onExportPdf).toHaveBeenCalledTimes(1);
  });

  it('TC-ST-05a: Actions dropdown opens on Enter keydown when trigger focused', () => {
    render(<SelectionToolbar {...defaultProps} />);
    const trigger = screen.getByRole('button', { name: /actions/i });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('TC-ST-05b: dropdown items reachable by keyboard and fire callbacks on Enter', () => {
    render(<SelectionToolbar {...defaultProps} />);
    const trigger = screen.getByRole('button', { name: /actions/i });
    fireEvent.click(trigger);

    const zipBtn = screen.getByRole('menuitem', { name: /export archive/i });
    fireEvent.keyDown(zipBtn, { key: 'Enter' });
    expect(defaultProps.onExportZip).toHaveBeenCalledTimes(1);
  });

  it('renders with role=toolbar and aria-label', () => {
    const { container } = render(<SelectionToolbar {...defaultProps} />);
    const toolbar = container.querySelector('[role="toolbar"]');
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toHaveAttribute('aria-label', 'Selection actions');
  });

  it('delete menuitem has aria-describedby pointing to count label', () => {
    const { container } = render(<SelectionToolbar {...defaultProps} />);
    // Open the dropdown to render the delete item
    const trigger = screen.getByRole('button', { name: /actions/i });
    fireEvent.click(trigger);
    const deleteBtn = screen.getByRole('menuitem', { name: /delete selection/i });
    const describedById = deleteBtn.getAttribute('aria-describedby');
    expect(describedById).toBeTruthy();
    const label = container.querySelector(`#${CSS.escape(describedById!)}`);
    expect(label).toBeInTheDocument();
  });
});
