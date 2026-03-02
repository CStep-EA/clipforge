// src/__tests__/RecipeExportButton.test.tsx — 15 uncovered → target 80%+
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Use global mock from src/__mocks__/base44Client.js — it already has
// base44.functions.invoke and base44.entities.ShoppingList
jest.mock('@/api/base44Client');

const { base44 } = require('@/api/base44Client');

import RecipeExportButton from '../components/dashboard/RecipeExportButton';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

const recipeItem = { id: 'r1', title: 'Banana Bread', category: 'recipe', url: 'https://r.com/banana' };
const dealItem   = { id: 'd1', title: 'Big Sale',     category: 'deal',   url: 'https://deal.com' };

describe('RecipeExportButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: successful invoke returning ingredients
    base44.functions.invoke.mockResolvedValue({
      data: {
        extendedIngredients: [
          { name: 'flour', amount: 2, unit: 'cups' },
          { name: 'sugar', amount: 1, unit: 'cup' },
        ],
      },
    });
    base44.entities.ShoppingList.create.mockResolvedValue({ id: 'sl1' });
  });

  it('renders nothing when item category is not "recipe"', () => {
    const { container } = render(<RecipeExportButton item={dealItem} />, { wrapper: makeWrapper() });
    expect(container.textContent).toBe('');
  });

  it('renders "→ List" button for recipe items', () => {
    render(<RecipeExportButton item={recipeItem} />, { wrapper: makeWrapper() });
    expect(screen.getByText(/→ List/i)).toBeInTheDocument();
  });

  it('calls functions.invoke when → List is clicked', async () => {
    render(<RecipeExportButton item={recipeItem} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /→ List/i }));
    await waitFor(() =>
      expect(base44.functions.invoke).toHaveBeenCalledWith('spoonacular', {
        url: recipeItem.url,
        title: recipeItem.title,
      })
    );
  });

  it('shows "Extracting…" loading state while fetching', async () => {
    let resolveInvoke: (v: any) => void;
    base44.functions.invoke.mockImplementation(
      () => new Promise(r => { resolveInvoke = r as any; })
    );
    render(<RecipeExportButton item={recipeItem} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /→ List/i }));
    await waitFor(() => expect(screen.getByText(/Extracting/i)).toBeInTheDocument());
    // Clean up: resolve the pending promise
    resolveInvoke!({ data: { extendedIngredients: [] } });
  });

  it('creates a ShoppingList after successful invoke', async () => {
    render(<RecipeExportButton item={recipeItem} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /→ List/i }));
    await waitFor(() =>
      expect(base44.entities.ShoppingList.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.stringContaining('Banana Bread') })
      ),
      { timeout: 3000 }
    );
  });

  it('shows "View List" link after successful export', async () => {
    render(<RecipeExportButton item={recipeItem} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /→ List/i }));
    await waitFor(() => expect(screen.getByText(/View List/i)).toBeInTheDocument(), { timeout: 3000 });
  });

  it('resets to idle when ShoppingList.create throws (catch branch)', async () => {
    base44.entities.ShoppingList.create.mockRejectedValue(new Error('Create failed'));
    render(<RecipeExportButton item={recipeItem} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /→ List/i }));
    // After the error, status resets to idle — button reappears
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /→ List/i })).toBeInTheDocument()
    , { timeout: 3000 });
  });
});
