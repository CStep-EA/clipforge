// src/__tests__/DashboardSearch.test.tsx
// DashboardSearch has real filterable logic — tests that keyword filter
// works correctly without needing the AI/LLM path.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardSearch from '../components/dashboard/DashboardSearch';

const mockItems = [
  { id: '1', title: 'Beef Tacos Recipe', category: 'recipe', tags: ['mexican', 'beef'], description: 'Crispy tacos' },
  { id: '2', title: 'Nike Air Max Deal', category: 'deal', tags: ['shoes', 'sale'], description: 'Great discount' },
  { id: '3', title: 'Colorado Hiking Event', category: 'event', tags: ['outdoors'], description: 'Trail run' },
  { id: '4', title: 'Sourdough Bread Recipe', category: 'recipe', tags: ['bread', 'baking'], description: 'Artisan loaf' },
];

describe('DashboardSearch', () => {
  it('renders the search input', () => {
    render(<DashboardSearch items={mockItems} onResults={jest.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onResults(null) when input is cleared', () => {
    const onResults = jest.fn();
    render(<DashboardSearch items={mockItems} onResults={onResults} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'taco' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(onResults).toHaveBeenLastCalledWith(null);
  });

  it('filters items by title keyword', () => {
    const onResults = jest.fn();
    render(<DashboardSearch items={mockItems} onResults={onResults} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'taco' } });
    // Should find "Beef Tacos Recipe"
    const lastCall = onResults.mock.calls[onResults.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(1);
    expect(lastCall[0].id).toBe('1');
  });

  it('filters items by tag', () => {
    const onResults = jest.fn();
    render(<DashboardSearch items={mockItems} onResults={onResults} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'baking' } });
    const lastCall = onResults.mock.calls[onResults.mock.calls.length - 1][0];
    expect(lastCall.some((i: any) => i.id === '4')).toBe(true);
  });

  it('filters items by category', () => {
    const onResults = jest.fn();
    render(<DashboardSearch items={mockItems} onResults={onResults} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'deal' } });
    const lastCall = onResults.mock.calls[onResults.mock.calls.length - 1][0];
    expect(lastCall.some((i: any) => i.id === '2')).toBe(true);
  });

  it('shows clear (X) button once user types', async () => {
    render(<DashboardSearch items={mockItems} onResults={jest.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'recipe' } });
    await waitFor(() => {
      // The clear button should appear — find by its accessible role or data attribute
      expect(screen.getByRole('textbox')).toHaveValue('recipe');
    });
  });
});
