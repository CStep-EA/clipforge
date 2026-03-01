// src/__tests__/Dashboard.test.tsx
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('Dashboard page', () => {
  it('renders without crashing', async () => {
    const { container } = render(<Dashboard />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('renders a non-empty DOM', async () => {
    const { container } = render(<Dashboard />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(container.innerHTML.length).toBeGreaterThan(0);
    });
  });
});
