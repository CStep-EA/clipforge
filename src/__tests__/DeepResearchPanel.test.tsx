// src/__tests__/DeepResearchPanel.test.tsx — 8% → 80%+ coverage
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/api/base44Client', () => ({
  base44: {
    auth: { me: jest.fn().mockResolvedValue({ id: 'u1' }) },
    entities: {
      UserSubscription: { filter: jest.fn().mockResolvedValue([]) },
      PremiumTrial:     { filter: jest.fn().mockResolvedValue([]) },
      SpecialAccount:   { filter: jest.fn().mockResolvedValue([]) },
    },
    functions: {
      invoke: jest.fn().mockResolvedValue({
        data: {
          research: {
            sentiment: 'positive',
            confidence: 0.87,
            summary: 'Strong deal for dairy farm operations.',
            key_insights: ['Price dropped 20%', 'High quality minerals'],
            action: 'buy',           // component reads research.action
            recommended_action: 'buy',
            sources: ['https://source1.com'],
          },
        },
      }),
    },
    integrations: { Core: {} },
  },
}));

const { base44 } = require('@/api/base44Client');

import DeepResearchPanel from '../components/shared/DeepResearchPanel';

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
  title: 'Best Dairy Mineral Mix',
  description: 'Premium minerals for dairy cows at 20% off.',
  category: 'deal',
  url: 'https://zinpro.example.com/mineral-mix',
};

describe('DeepResearchPanel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders PRO upgrade gate when isPro=false', () => {
    render(<DeepResearchPanel item={mockItem} isPro={false} />, { wrapper: makeWrapper() });
    expect(screen.getByText(/AI Deep Research/i)).toBeInTheDocument();
    // "PRO" appears in both the badge and the button text — use getAllByText
    expect(screen.getAllByText(/PRO/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders Upgrade to Pro button for non-Pro users', () => {
    render(<DeepResearchPanel item={mockItem} isPro={false} />, { wrapper: makeWrapper() });
    expect(screen.getByText(/Upgrade to Pro/i)).toBeInTheDocument();
  });

  it('shows free users a description of the Pro feature', () => {
    render(<DeepResearchPanel item={mockItem} isPro={false} />, { wrapper: makeWrapper() });
    expect(screen.getByText(/sentiment analysis/i)).toBeInTheDocument();
  });

  it('renders Run Deep Research button for Pro users', () => {
    render(<DeepResearchPanel item={mockItem} isPro={true} />, { wrapper: makeWrapper() });
    expect(screen.getByText(/Deep Research/i)).toBeInTheDocument();
  });

  it('calls base44.functions.invoke when button clicked', async () => {
    render(<DeepResearchPanel item={mockItem} isPro={true} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByText(/Deep Research/i).closest('button')!);
    await waitFor(() =>
      expect(base44.functions.invoke).toHaveBeenCalledWith('deepResearch', expect.objectContaining({
        url: mockItem.url,
        title: mockItem.title,
      }))
    );
  });

  it('displays research summary after successful call', async () => {
    render(<DeepResearchPanel item={mockItem} isPro={true} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByText(/Deep Research/i).closest('button')!);
    await waitFor(() =>
      expect(screen.getByText(/Strong deal for dairy farm operations/i)).toBeInTheDocument()
    );
  });

  it('shows the recommended action badge', async () => {
    render(<DeepResearchPanel item={mockItem} isPro={true} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByText(/Deep Research/i).closest('button')!);
    await waitFor(() =>
      expect(screen.getByText(/Buy It/i)).toBeInTheDocument()
    );
  });

  it('displays insights returned by the research', async () => {
    render(<DeepResearchPanel item={mockItem} isPro={true} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByText(/Deep Research/i).closest('button')!);
    // Insights are under research.key_insights
    await waitFor(() =>
      expect(screen.getByText(/Price dropped 20%/i)).toBeInTheDocument()
    );
  });

  it('shows loading state while researching', async () => {
    base44.functions.invoke.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: { research: { summary: 'done' } } }), 500))
    );
    render(<DeepResearchPanel item={mockItem} isPro={true} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByText(/Deep Research/i).closest('button')!);
    // Component renders "Scraping & analyzing..." during loading
    await waitFor(() =>
      expect(screen.getByText(/Scraping/i)).toBeInTheDocument()
    );
  });

  it('shows error when invoke throws', async () => {
    base44.functions.invoke.mockRejectedValue(new Error('Network error'));
    render(<DeepResearchPanel item={mockItem} isPro={true} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByText(/Deep Research/i).closest('button')!);
    await waitFor(() =>
      expect(screen.getByText(/Network error|Failed|error/i)).toBeInTheDocument()
    );
  });

  // ── upgrade_required error path (lines 40/44) ──────────────────────────────

  it('shows upgrade prompt when isPro=false', () => {
    render(<DeepResearchPanel item={mockItem} isPro={false} />, { wrapper: makeWrapper() });
    // isPro=false renders the upgrade CTA directly
    expect(screen.getByText(/Upgrade to Pro/i)).toBeInTheDocument();
  });

  it('handles upgrade_required silently when isPro=true (no crash)', async () => {
    base44.functions.invoke.mockResolvedValue({ data: { error: 'upgrade_required' } });
    render(<DeepResearchPanel item={mockItem} isPro={true} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByText(/Deep Research/i).closest('button')!);
    // Component sets error='upgrade' but renders no text for this case
    // Verify invoke was called and no unhandled error thrown
    await waitFor(() =>
      expect(base44.functions.invoke).toHaveBeenCalled()
    , { timeout: 3000 });
    // Component should still be in the DOM (no crash)
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  // ── related_topics and run-again button (lines 159-169) ────────────────────

  it('displays related topics when research returns them', async () => {
    base44.functions.invoke.mockResolvedValue({
      data: {
        research: {
          summary: 'Great deal.',
          key_insights: [],
          related_topics: ['Dairy Nutrition', 'Zinc Supplements', 'Mineral Efficiency'],
          action: 'buy',
        },
      },
    });
    render(<DeepResearchPanel item={mockItem} isPro={true} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByText(/Deep Research/i).closest('button')!);
    await waitFor(() =>
      expect(screen.getByText(/Dairy Nutrition/i)).toBeInTheDocument()
    );
  });

  it('renders "Run again" button after research completes', async () => {
    render(<DeepResearchPanel item={mockItem} isPro={true} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByText(/Deep Research/i).closest('button')!);
    await waitFor(() =>
      expect(screen.getByText(/Run again/i)).toBeInTheDocument()
    );
    // Click run again — resets research state
    fireEvent.click(screen.getByText(/Run again/i));
    await waitFor(() =>
      expect(screen.getByText(/Deep Research/i)).toBeInTheDocument()
    );
  });

  it('shows generic error when invoke returns no research data (line 44)', async () => {
    base44.functions.invoke.mockResolvedValue({ data: {} }); // no .research, no upgrade_required
    render(<DeepResearchPanel item={mockItem} isPro={true} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByText(/Deep Research/i).closest('button')!);
    await waitFor(() =>
      expect(screen.getByText(/Failed to generate research/i)).toBeInTheDocument()
    );
  });
});
