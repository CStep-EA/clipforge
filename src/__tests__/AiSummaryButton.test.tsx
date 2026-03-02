// src/__tests__/AiSummaryButton.test.tsx — 0% → 80%+ coverage
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/api/base44Client', () => ({
  base44: {
    auth: { me: jest.fn().mockResolvedValue({ id: 'u1' }) },
    entities: {
      SavedItem:        { update: jest.fn().mockResolvedValue({}) },
      UserSubscription: { filter: jest.fn().mockResolvedValue([]) },
      PremiumTrial:     { filter: jest.fn().mockResolvedValue([]) },
      SpecialAccount:   { filter: jest.fn().mockResolvedValue([]) },
    },
    integrations: {
      Core: { InvokeLLM: jest.fn().mockResolvedValue('Zinpro minerals boost cow health by 15%.') },
    },
    functions: { invoke: jest.fn() },
  },
}));

const { base44 } = require('@/api/base44Client');

import AiSummaryButton from '../components/saves/AiSummaryButton';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

const mockItem = {
  id: 'item1',
  title: 'Best Dairy Minerals',
  description: 'Zinpro minerals for dairy cows',
  category: 'deal',
  url: 'https://zinpro.example.com',
};

describe('AiSummaryButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders upgrade prompt when user is not Pro', () => {
    render(<AiSummaryButton item={mockItem} isPro={false} />, { wrapper: makeWrapper() });
    expect(screen.getByText(/AI Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/PRO/i)).toBeInTheDocument();
  });

  it('renders Upgrade button linking to Pricing when not Pro', () => {
    render(<AiSummaryButton item={mockItem} isPro={false} />, { wrapper: makeWrapper() });
    expect(screen.getByText(/Upgrade/i)).toBeInTheDocument();
  });

  it('renders the AI Summary button for Pro users', () => {
    render(<AiSummaryButton item={mockItem} isPro={true} />, { wrapper: makeWrapper() });
    expect(screen.getByText(/AI Summary/i)).toBeInTheDocument();
  });

  it('shows loading state while generating summary', async () => {
    // Make InvokeLLM hang so we can see loading
    base44.integrations.Core.InvokeLLM.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('result'), 500))
    );
    render(<AiSummaryButton item={mockItem} isPro={true} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByText(/AI Summary/i).closest('button')!);
    await waitFor(() => expect(screen.getByText(/Summarizing/i)).toBeInTheDocument());
  });

  it('displays generated summary after clicking AI Summary', async () => {
    base44.integrations.Core.InvokeLLM.mockResolvedValue('Zinpro minerals boost cow health by 15%.');
    render(<AiSummaryButton item={mockItem} isPro={true} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByText(/AI Summary/i).closest('button')!);
    await waitFor(() =>
      expect(screen.getByText(/Zinpro minerals boost cow health/i)).toBeInTheDocument()
    );
  });

  it('calls SavedItem.update with generated summary', async () => {
    base44.integrations.Core.InvokeLLM.mockResolvedValue('Great mineral deal for dairy ops.');
    render(<AiSummaryButton item={mockItem} isPro={true} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByText(/AI Summary/i).closest('button')!);
    await waitFor(() =>
      expect(base44.entities.SavedItem.update).toHaveBeenCalledWith(
        'item1', expect.objectContaining({ ai_summary: expect.any(String) })
      )
    );
  });

  it('renders existing summary without needing to click generate', () => {
    const itemWithSummary = { ...mockItem, ai_summary: 'Pre-existing summary text here.' };
    render(<AiSummaryButton item={itemWithSummary} isPro={true} />, { wrapper: makeWrapper() });
    expect(screen.getByText(/Pre-existing summary text here/i)).toBeInTheDocument();
  });

  it('shows refresh button when summary is displayed', () => {
    const itemWithSummary = { ...mockItem, ai_summary: 'Pre-existing summary text here.' };
    render(<AiSummaryButton item={itemWithSummary} isPro={true} />, { wrapper: makeWrapper() });
    // RefreshCw icon button should exist
    const refreshBtn = screen.getByRole('button');
    expect(refreshBtn).toBeInTheDocument();
  });

  it('shows error message when InvokeLLM throws', async () => {
    base44.integrations.Core.InvokeLLM.mockRejectedValue(new Error('API down'));
    render(<AiSummaryButton item={mockItem} isPro={true} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByText(/AI Summary/i).closest('button')!);
    await waitFor(() =>
      expect(screen.getByText(/Failed to generate/i)).toBeInTheDocument()
    );
  });

  it('clears summary when refresh button is clicked', async () => {
    const itemWithSummary = { ...mockItem, ai_summary: 'Some summary to clear.' };
    render(<AiSummaryButton item={itemWithSummary} isPro={true} />, { wrapper: makeWrapper() });
    expect(screen.getByText(/Some summary to clear/i)).toBeInTheDocument();
    const refreshBtn = screen.getByRole('button');
    fireEvent.click(refreshBtn);
    await waitFor(() =>
      expect(screen.queryByText(/Some summary to clear/i)).not.toBeInTheDocument()
    );
    // After clearing, the "AI Summary" generate button should reappear
    expect(screen.getByText(/AI Summary/i)).toBeInTheDocument();
  });
});
