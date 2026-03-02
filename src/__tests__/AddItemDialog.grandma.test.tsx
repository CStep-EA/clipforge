/**
 * AddItemDialog.grandma.test.tsx
 * Tests the grandma-proof 2-field progressive disclosure redesign:
 *   - URL and Title fields visible by default
 *   - Advanced fields (Category, Source, Description, Tags, Notes) hidden by default
 *   - "More options" toggle reveals advanced fields
 *   - "Fewer options" toggle hides them again
 *   - AI Sparkles button triggers analyzeItem
 *   - AI summary shown after analysis
 *   - URL input has font-size 16px (no iOS zoom)
 *   - Title input has font-size 16px
 *   - Save button disabled when title empty
 *   - Save button enabled with title
 *   - Edit mode: starts with advanced section visible
 *   - Event category shows event-specific fields
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('@/api/base44Client', () => ({
  base44: {
    auth: { me: jest.fn().mockResolvedValue({ id: 'u1' }) },
    entities: {
      SavedItem: { create: jest.fn().mockResolvedValue({ id: 'new1' }) },
    },
    functions: { invoke: jest.fn().mockResolvedValue({
      category: 'deal',
      ai_summary: 'Great farm deal on tractors.',
      tags: ['farm', 'tractor'],
      rating: 9,
      suggested_title: '',
    }) },
    integrations: { Core: { InvokeLLM: jest.fn() } },
  },
}));

const { base44 } = require('@/api/base44Client');

jest.mock('@/components/events/AddToCalendarButton', () => ({
  __esModule: true,
  default: () => <div data-testid="add-to-calendar" />,
}));

import AddItemDialog from '../components/shared/AddItemDialog';

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  onSave: jest.fn().mockResolvedValue({ id: 'new1' }),
  editItem: undefined,
};

function renderDialog(props = {}) {
  return render(<AddItemDialog {...defaultProps} {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  base44.functions.invoke.mockResolvedValue({
    category: 'deal',
    ai_summary: 'Great farm deal on tractors.',
    tags: ['farm', 'tractor'],
    rating: 9,
    suggested_title: '',
  });
  defaultProps.onSave.mockResolvedValue({ id: 'new1' });
});

// ── Default 2-field view ──────────────────────────────────────────────────────

describe('AddItemDialog – 2-field default view', () => {
  it('URL field is visible on open', () => {
    renderDialog();
    expect(screen.getByRole('textbox', { name: /url or link to save/i })).toBeInTheDocument();
  });

  it('Title field is visible on open', () => {
    renderDialog();
    expect(screen.getByRole('textbox', { name: /title/i })).toBeInTheDocument();
  });

  it('AI sparkles button is visible on open', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: /analyse with ai/i })).toBeInTheDocument();
  });

  it('Category field is NOT visible by default', () => {
    renderDialog();
    expect(screen.queryByText(/^category$/i)).toBeNull();
  });

  it('Source field is NOT visible by default', () => {
    renderDialog();
    expect(screen.queryByText(/^source$/i)).toBeNull();
  });

  it('Description field is NOT visible by default', () => {
    renderDialog();
    expect(screen.queryByText(/^description$/i)).toBeNull();
  });

  it('Tags field is NOT visible by default', () => {
    renderDialog();
    expect(screen.queryByText(/^tags$/i)).toBeNull();
  });

  it('Notes field is NOT visible by default', () => {
    renderDialog();
    expect(screen.queryByText(/^notes$/i)).toBeNull();
  });

  it('"More options" button is visible', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: /more options/i })).toBeInTheDocument();
  });
});

// ── Progressive disclosure ────────────────────────────────────────────────────

describe('AddItemDialog – progressive disclosure', () => {
  it('clicking More options shows Category field', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /more options/i }));
    expect(await screen.findByText(/^category$/i)).toBeInTheDocument();
  });

  it('clicking More options shows Source field', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /more options/i }));
    expect(await screen.findByText(/^source$/i)).toBeInTheDocument();
  });

  it('clicking More options shows Description field', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /more options/i }));
    expect(await screen.findByText(/^description$/i)).toBeInTheDocument();
  });

  it('clicking More options shows Tags field', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /more options/i }));
    expect(await screen.findByText(/^tags$/i)).toBeInTheDocument();
  });

  it('clicking More options shows Notes field', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /more options/i }));
    expect(await screen.findByText(/^notes$/i)).toBeInTheDocument();
  });

  it('clicking Fewer options hides the advanced fields again', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /more options/i }));
    await screen.findByText(/^category$/i);
    fireEvent.click(screen.getByRole('button', { name: /fewer options/i }));
    expect(screen.queryByText(/^category$/i)).toBeNull();
  });

  it('More options button has aria-expanded=false initially', () => {
    renderDialog();
    const btn = screen.getByRole('button', { name: /more options/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('More options button has aria-expanded=true when open', async () => {
    renderDialog();
    const btn = screen.getByRole('button', { name: /more options/i });
    fireEvent.click(btn);
    await screen.findByText(/^category$/i);
    expect(screen.getByRole('button', { name: /fewer options/i })).toHaveAttribute('aria-expanded', 'true');
  });
});

// ── Edit mode ─────────────────────────────────────────────────────────────────

describe('AddItemDialog – edit mode', () => {
  const editItem = {
    title: 'Existing save',
    url: 'https://existing.com',
    description: 'Old description',
    category: 'deal',
    source: 'manual',
    tags: ['farm'],
    notes: 'Old notes',
  };

  it('opens with advanced fields visible in edit mode', () => {
    renderDialog({ editItem });
    // Category should be visible because editItem is truthy
    expect(screen.getByText(/^category$/i)).toBeInTheDocument();
  });

  it('pre-fills title from editItem', () => {
    renderDialog({ editItem });
    expect(screen.getByDisplayValue('Existing save')).toBeInTheDocument();
  });

  it('pre-fills URL from editItem', () => {
    renderDialog({ editItem });
    expect(screen.getByDisplayValue('https://existing.com')).toBeInTheDocument();
  });

  it('shows "Save Changes" button in edit mode', () => {
    renderDialog({ editItem });
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });
});

// ── AI analysis ───────────────────────────────────────────────────────────────

describe('AddItemDialog – AI analysis', () => {
  it('clicking AI button calls base44.functions.invoke analyzeItem', async () => {
    renderDialog();
    const urlInput = screen.getByRole('textbox', { name: /url or link to save/i });
    fireEvent.change(urlInput, { target: { value: 'https://tractor.com' } });
    fireEvent.click(screen.getByRole('button', { name: /analyse with ai/i }));
    await waitFor(() => {
      expect(base44.functions.invoke).toHaveBeenCalledWith(
        'analyzeItem',
        expect.objectContaining({ url: 'https://tractor.com' })
      );
    });
  });

  it('shows AI summary after analysis', async () => {
    renderDialog();
    const urlInput = screen.getByRole('textbox', { name: /url or link to save/i });
    fireEvent.change(urlInput, { target: { value: 'https://tractor.com' } });
    fireEvent.click(screen.getByRole('button', { name: /analyse with ai/i }));
    expect(await screen.findByText('Great farm deal on tractors.')).toBeInTheDocument();
  });
});

// ── Save button ───────────────────────────────────────────────────────────────

describe('AddItemDialog – save button', () => {
  it('Add to Vault button is disabled when title is empty', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: /add to vault/i })).toBeDisabled();
  });

  it('Add to Vault button is enabled when title is filled', () => {
    renderDialog();
    const titleInput = screen.getByRole('textbox', { name: /title/i });
    fireEvent.change(titleInput, { target: { value: 'My great find' } });
    expect(screen.getByRole('button', { name: /add to vault/i })).not.toBeDisabled();
  });

  it('clicking Add to Vault calls onSave with form data', async () => {
    renderDialog();
    const titleInput = screen.getByRole('textbox', { name: /title/i });
    fireEvent.change(titleInput, { target: { value: 'Farm equipment deal' } });
    fireEvent.click(screen.getByRole('button', { name: /add to vault/i }));
    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Farm equipment deal' })
      );
    });
  });
});

// ── iOS zoom prevention ───────────────────────────────────────────────────────

describe('AddItemDialog – iOS zoom prevention', () => {
  it('URL input has font-size 16px style', () => {
    renderDialog();
    const urlInput = screen.getByRole('textbox', { name: /url or link to save/i });
    expect(urlInput).toHaveStyle('font-size: 16px');
  });

  it('Title input has font-size 16px style', () => {
    renderDialog();
    const titleInput = screen.getByRole('textbox', { name: /title/i });
    expect(titleInput).toHaveStyle('font-size: 16px');
  });
});
