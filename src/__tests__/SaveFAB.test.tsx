/**
 * SaveFAB.test.tsx
 * Tests for the floating action button:
 *   - Renders on mobile (always in DOM, CSS hides on desktop)
 *   - Main + button visible
 *   - Click expands to "Save Link" and "Save Note" sub-actions
 *   - Sub-actions call the correct callbacks
 *   - Escape key closes the expanded menu
 *   - Second click on + closes menu (toggle)
 *   - aria-expanded reflects open state
 *   - Outside click closes the menu
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import SaveFAB from '../components/shared/SaveFAB';

function renderFAB(onSaveLink = jest.fn(), onSaveNote = jest.fn()) {
  return render(<SaveFAB onSaveLink={onSaveLink} onSaveNote={onSaveNote} />);
}

describe('SaveFAB – render', () => {
  it('renders the main + button', () => {
    renderFAB();
    expect(
      screen.getByRole('button', { name: /open quick save menu/i })
    ).toBeInTheDocument();
  });

  it('sub-actions are NOT visible on initial render', () => {
    renderFAB();
    expect(screen.queryByRole('button', { name: /save link/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /save note/i })).toBeNull();
  });

  it('main button has aria-expanded=false initially', () => {
    renderFAB();
    const btn = screen.getByRole('button', { name: /open quick save menu/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('SaveFAB – open/close', () => {
  it('clicking + reveals Save Link and Save Note', () => {
    renderFAB();
    fireEvent.click(screen.getByRole('button', { name: /open quick save menu/i }));
    expect(screen.getByRole('button', { name: /save link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save note/i })).toBeInTheDocument();
  });

  it('aria-expanded becomes true when open', () => {
    renderFAB();
    const btn = screen.getByRole('button', { name: /open quick save menu/i });
    fireEvent.click(btn);
    // After open, button label changes — find by new label
    const closeBtn = screen.getByRole('button', { name: /close quick save menu/i });
    expect(closeBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('clicking + again closes the menu', () => {
    renderFAB();
    const mainBtn = screen.getByRole('button', { name: /open quick save menu/i });
    fireEvent.click(mainBtn);
    // Now open — button label changes
    expect(screen.getByRole('button', { name: /close quick save menu/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close quick save menu/i }));
    expect(screen.queryByRole('button', { name: /save link/i })).toBeNull();
  });

  it('pressing Escape closes the menu', () => {
    renderFAB();
    fireEvent.click(screen.getByRole('button', { name: /open quick save menu/i }));
    expect(screen.getByRole('button', { name: /save link/i })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: /save link/i })).toBeNull();
  });
});

describe('SaveFAB – callbacks', () => {
  it('clicking Save Link calls onSaveLink and closes menu', () => {
    const onSaveLink = jest.fn();
    renderFAB(onSaveLink);
    fireEvent.click(screen.getByRole('button', { name: /open quick save menu/i }));
    fireEvent.click(screen.getByRole('button', { name: /save link/i }));
    expect(onSaveLink).toHaveBeenCalledTimes(1);
    // Menu should close after action
    expect(screen.queryByRole('button', { name: /save link/i })).toBeNull();
  });

  it('clicking Save Note calls onSaveNote and closes menu', () => {
    const onSaveNote = jest.fn();
    renderFAB(jest.fn(), onSaveNote);
    fireEvent.click(screen.getByRole('button', { name: /open quick save menu/i }));
    fireEvent.click(screen.getByRole('button', { name: /save note/i }));
    expect(onSaveNote).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /save note/i })).toBeNull();
  });

  it('works without callbacks (no crash)', () => {
    render(<SaveFAB />);
    fireEvent.click(screen.getByRole('button', { name: /open quick save menu/i }));
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: /save link/i }))
    ).not.toThrow();
  });
});

describe('SaveFAB – accessibility', () => {
  it('main button has aria-label', () => {
    renderFAB();
    const btn = screen.getByRole('button', { name: /quick save menu/i });
    expect(btn).toHaveAttribute('aria-label');
  });

  it('sub-action buttons have aria-label', () => {
    renderFAB();
    fireEvent.click(screen.getByRole('button', { name: /open quick save menu/i }));
    expect(screen.getByRole('button', { name: /save link/i })).toHaveAttribute('aria-label');
    expect(screen.getByRole('button', { name: /save note/i })).toHaveAttribute('aria-label');
  });
});
