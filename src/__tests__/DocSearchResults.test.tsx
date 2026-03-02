// src/__tests__/DocSearchResults.test.tsx — 7% → 85%+ coverage
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
    integrations: {
      Core: {
        InvokeLLM: jest.fn().mockResolvedValue(
          'ClipForge collects minimal data. For full details, see our [Privacy Policy], [Terms of Service], or [Cookie Policy].'
        ),
      },
    },
    functions: { invoke: jest.fn() },
  },
}));

const { base44 } = require('@/api/base44Client');

import DocSearchResults from '../components/support/DocSearchResults';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe('DocSearchResults', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows documentation matches for a known keyword (privacy)', () => {
    render(<DocSearchResults query="privacy" onAskBot={jest.fn()} />, { wrapper: makeWrapper() });
    expect(screen.getByText(/Documentation matches/i)).toBeInTheDocument();
    expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
  });

  it('shows the GDPR Rights doc for "gdpr" query', () => {
    render(<DocSearchResults query="gdpr" onAskBot={jest.fn()} />, { wrapper: makeWrapper() });
    expect(screen.getByText(/GDPR Rights/i)).toBeInTheDocument();
  });

  it('shows Cookie Policy for "cookie" query', () => {
    render(<DocSearchResults query="cookie" onAskBot={jest.fn()} />, { wrapper: makeWrapper() });
    expect(screen.getByText(/Cookie Policy/i)).toBeInTheDocument();
  });

  it('renders "No direct doc matches" when query has no results', () => {
    render(<DocSearchResults query="xyzquux12345" onAskBot={jest.fn()} />, { wrapper: makeWrapper() });
    expect(screen.getByText(/No direct doc matches/i)).toBeInTheDocument();
  });

  it('renders Ask AI about docs button', () => {
    render(<DocSearchResults query="privacy" onAskBot={jest.fn()} />, { wrapper: makeWrapper() });
    expect(screen.getByText(/Ask AI about docs/i)).toBeInTheDocument();
  });

  it('renders Ask Support Bot button', () => {
    render(<DocSearchResults query="privacy" onAskBot={jest.fn()} />, { wrapper: makeWrapper() });
    expect(screen.getByText(/Ask Support Bot/i)).toBeInTheDocument();
  });

  it('calls onAskBot when Ask Support Bot is clicked', () => {
    const onAskBot = jest.fn();
    render(<DocSearchResults query="privacy" onAskBot={onAskBot} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByText(/Ask Support Bot/i));
    expect(onAskBot).toHaveBeenCalled();
  });

  it('calls InvokeLLM and shows AI answer when Ask AI is clicked', async () => {
    render(<DocSearchResults query="data privacy" onAskBot={jest.fn()} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByText(/Ask AI about docs/i));
    await waitFor(() =>
      expect(screen.getByText(/AI Doc Answer/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/ClipForge collects minimal data/i)).toBeInTheDocument();
  });

  it('shows the legal disclaimer after AI answer', async () => {
    render(<DocSearchResults query="data privacy" onAskBot={jest.fn()} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByText(/Ask AI about docs/i));
    await waitFor(() =>
      expect(screen.getByText(/informational purposes only/i)).toBeInTheDocument()
    );
  });

  it('shows the AI Transparency Whitepaper for "ai" query', () => {
    render(<DocSearchResults query="ai" onAskBot={jest.fn()} />, { wrapper: makeWrapper() });
    expect(screen.getByText(/AI Transparency Whitepaper/i)).toBeInTheDocument();
  });
});
