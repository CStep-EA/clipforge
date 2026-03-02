// src/__tests__/TrialBanner.test.tsx — 22 uncovered → target 75%+
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/api/base44Client', () => ({
  base44: {
    auth: { me: jest.fn().mockResolvedValue({ id: 'u1', email: 'farmer@test.com' }) },
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

import TrialBanner from '../components/subscription/TrialBanner';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

const freeUser = { id: 'u1', email: 'farmer@test.com' };

describe('TrialBanner', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when plan is not "free"', () => {
    const { container } = render(
      <TrialBanner user={freeUser} plan="pro" />,
      { wrapper: makeWrapper() }
    );
    expect(container.textContent).toBe('');
  });

  it('renders nothing when user is null', () => {
    const { container } = render(
      <TrialBanner user={null} plan="free" />,
      { wrapper: makeWrapper() }
    );
    expect(container.textContent).toBe('');
  });

  it('renders the trial offer banner for free users with no prior trial', async () => {
    base44.entities.PremiumTrial.filter.mockResolvedValue([]);
    render(<TrialBanner user={freeUser} plan="free" />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getByText(/Try Premium Free for 7 Days/i)).toBeInTheDocument());
  });

  it('shows the Start Trial button', async () => {
    base44.entities.PremiumTrial.filter.mockResolvedValue([]);
    render(<TrialBanner user={freeUser} plan="free" />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getByText(/Start Trial/i)).toBeInTheDocument());
  });

  it('shows the referral strip with Copy link button', async () => {
    base44.entities.PremiumTrial.filter.mockResolvedValue([]);
    render(<TrialBanner user={freeUser} plan="free" />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Invite friends/i)).toBeInTheDocument();
      expect(screen.getByText(/Copy link/i)).toBeInTheDocument();
    });
  });

  it('dismisses the banner when X button is clicked', async () => {
    base44.entities.PremiumTrial.filter.mockResolvedValue([]);
    render(<TrialBanner user={freeUser} plan="free" />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getByText(/Try Premium Free/i));
    // There are two X buttons (one on trial, one on referral strip)
    const closeButtons = screen.getAllByRole('button').filter(b => !b.textContent?.match(/Trial|Copy|Start/));
    fireEvent.click(closeButtons[0]);
    await waitFor(() => expect(screen.queryByText(/Try Premium Free/i)).not.toBeInTheDocument());
  });

  it('shows active trial countdown when a trial is active', async () => {
    const trialEnd = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days from now
    base44.entities.PremiumTrial.filter.mockResolvedValue([{
      id: 'tr1',
      trial_plan: 'premium',
      trial_end: trialEnd,
      is_active: true,
    }]);
    render(<TrialBanner user={freeUser} plan="free" />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Premium Trial Active/i)).toBeInTheDocument();
      expect(screen.getByText(/days left/i)).toBeInTheDocument();
    });
  });

  it('shows TRIAL badge during active trial', async () => {
    const trialEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    base44.entities.PremiumTrial.filter.mockResolvedValue([{
      id: 'tr1', trial_plan: 'premium', trial_end: trialEnd, is_active: true,
    }]);
    render(<TrialBanner user={freeUser} plan="free" />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getByText('TRIAL')).toBeInTheDocument());
  });

  it('renders nothing after trial has been used (no active trial)', async () => {
    // filter returns a used trial (is_active=false / expired)
    base44.entities.PremiumTrial.filter.mockResolvedValue([{
      id: 'tr1', trial_plan: 'premium',
      trial_end: new Date(Date.now() - 86400000).toISOString(), // yesterday
      is_active: false,
    }]);
    const { container } = render(<TrialBanner user={freeUser} plan="free" />, { wrapper: makeWrapper() });
    // usedTrial=true → returns null
    await waitFor(() => expect(container.textContent).toBe(''));
  });

  it('copies referral link to clipboard when Copy link is clicked', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    base44.entities.PremiumTrial.filter.mockResolvedValue([]);
    render(<TrialBanner user={freeUser} plan="free" />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getByText(/Copy link/i));
    fireEvent.click(screen.getByText(/Copy link/i));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
  });

  it('shows Copied! text after referral link is copied', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    base44.entities.PremiumTrial.filter.mockResolvedValue([]);
    render(<TrialBanner user={freeUser} plan="free" />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getByText(/Copy link/i));
    fireEvent.click(screen.getByText(/Copy link/i));
    await waitFor(() => expect(screen.getByText(/Copied!/i)).toBeInTheDocument());
  });

  it('shows "subscribe to keep access" link during active trial', async () => {
    const trialEnd = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    base44.entities.PremiumTrial.filter.mockResolvedValue([{
      id: 'tr1', trial_plan: 'premium', trial_end: trialEnd, is_active: true,
    }]);
    render(<TrialBanner user={freeUser} plan="free" />, { wrapper: makeWrapper() });
    await waitFor(() =>
      expect(screen.getByText(/subscribe to keep access/i)).toBeInTheDocument()
    );
  });

  it('dismisses active trial banner when X is clicked', async () => {
    const trialEnd = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    base44.entities.PremiumTrial.filter.mockResolvedValue([{
      id: 'tr1', trial_plan: 'premium', trial_end: trialEnd, is_active: true,
    }]);
    render(<TrialBanner user={freeUser} plan="free" />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getByText(/Premium Trial Active/i));
    const xBtns = screen.getAllByRole('button').filter(b => !b.textContent?.match(/Trial|Subscribe/));
    if (xBtns.length) fireEvent.click(xBtns[0]);
    await waitFor(() =>
      expect(screen.queryByText(/Premium Trial Active/i)).not.toBeInTheDocument()
    );
  });
});
