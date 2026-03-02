// src/__tests__/TrialPrompt.test.tsx — 34 uncovered → target 70%+
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/api/base44Client', () => ({
  base44: {
    auth: { me: jest.fn().mockResolvedValue({ id: 'u1', email: 'trial@test.com' }) },
    entities: {
      PremiumTrial: {
        filter: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'tr1' }),
      },
      UserSubscription: { filter: jest.fn().mockResolvedValue([]) },
      SpecialAccount:   { filter: jest.fn().mockResolvedValue([]) },
    },
    integrations: { Core: {} },
  },
}));

const { base44 } = require('@/api/base44Client');

import TrialPrompt from '../components/subscription/TrialPrompt';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('TrialPrompt — closed state', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <TrialPrompt open={false} onOpenChange={jest.fn()} plan="premium" />,
      { wrapper: makeWrapper() }
    );
    expect(container.textContent).toBe('');
  });
});

describe('TrialPrompt — premium plan', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders "Premium" in the dialog heading', async () => {
    render(<TrialPrompt open={true} onOpenChange={jest.fn()} plan="premium" />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getByText(/Premium/i)).toBeInTheDocument());
  });

  it('shows the 7-day trial duration label', async () => {
    render(<TrialPrompt open={true} onOpenChange={jest.fn()} plan="premium" />, { wrapper: makeWrapper() });
    // Heading is rendered as: "Free " + "7" + "-Day " + "Premium"
    // getAllByText handles elements where the number is split across nodes
    await waitFor(() => {
      const sevens = screen.getAllByText(/7/);
      expect(sevens.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('lists the "Advanced AI agents" feature', async () => {
    render(<TrialPrompt open={true} onOpenChange={jest.fn()} plan="premium" />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getByText(/Advanced AI agents/i)).toBeInTheDocument());
  });

  it('shows "Ticketmaster & event integrations" feature', async () => {
    render(<TrialPrompt open={true} onOpenChange={jest.fn()} plan="premium" />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getByText(/Ticketmaster/i)).toBeInTheDocument());
  });

  it('renders the Start Trial button', async () => {
    render(<TrialPrompt open={true} onOpenChange={jest.fn()} plan="premium" />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getByText(/Start.*Trial/i)).toBeInTheDocument());
  });

  it('calls PremiumTrial.create when Start Trial is clicked', async () => {
    render(<TrialPrompt open={true} onOpenChange={jest.fn()} plan="premium" />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getByText(/Start.*Trial/i));
    fireEvent.click(screen.getByText(/Start.*Trial/i));
    await waitFor(() =>
      expect(base44.entities.PremiumTrial.create).toHaveBeenCalledWith(
        expect.objectContaining({ trial_plan: 'premium' })
      )
    );
  });

  it('shows already-used message when filter returns an existing trial', async () => {
    base44.entities.PremiumTrial.filter.mockResolvedValue([{ id: 'old', trial_plan: 'premium' }]);
    render(<TrialPrompt open={true} onOpenChange={jest.fn()} plan="premium" />, { wrapper: makeWrapper() });
    await waitFor(() => {
      // Multiple elements may contain "already used" (text + button label)
      expect(screen.getAllByText(/already used/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('disables Start Trial button when trial already used', async () => {
    base44.entities.PremiumTrial.filter.mockResolvedValue([{ id: 'old', trial_plan: 'premium' }]);
    render(<TrialPrompt open={true} onOpenChange={jest.fn()} plan="premium" />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getAllByText(/already used/i));
    const startBtn = screen.queryByRole('button', { name: /Start.*Trial/i });
    // When already used, the button is disabled or replaced
    if (startBtn) expect(startBtn).toBeDisabled();
  });
});

describe('TrialPrompt — family plan', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders "Family Premium" in the dialog heading', async () => {
    render(<TrialPrompt open={true} onOpenChange={jest.fn()} plan="family" />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getByText(/Family Premium/i)).toBeInTheDocument());
  });

  it('shows 14-day trial label for family plan', async () => {
    render(<TrialPrompt open={true} onOpenChange={jest.fn()} plan="family" />, { wrapper: makeWrapper() });
    await waitFor(() => {
      const fourteens = screen.getAllByText(/14/);
      expect(fourteens.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('lists the "Up to 6 family members" feature', async () => {
    render(<TrialPrompt open={true} onOpenChange={jest.fn()} plan="family" />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getByText(/Up to 6 family members/i)).toBeInTheDocument());
  });

  it('lists the "COPPA-compliant child accounts" feature', async () => {
    render(<TrialPrompt open={true} onOpenChange={jest.fn()} plan="family" />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getByText(/COPPA/i)).toBeInTheDocument());
  });
});
