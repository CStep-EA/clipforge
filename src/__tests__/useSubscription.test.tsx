// src/__tests__/useSubscription.test.tsx
// Tests the critical subscription tier logic — the most business-critical
// hook in the app. Free / pro / premium / family / trial / debug paths.
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSubscription } from '../components/shared/useSubscription';

// ── Mock factory ─────────────────────────────────────────────────────────────
// jest.mock is hoisted before const declarations, so mock fns must be
// created INSIDE the factory. Access them via require() after the fact.
jest.mock('@/api/base44Client', () => ({
  base44: {
    auth: { me: jest.fn() },
    entities: {
      UserSubscription: { filter: jest.fn() },
      PremiumTrial:     { filter: jest.fn() },
      SpecialAccount:   { filter: jest.fn() },
    },
    integrations: { Core: { InvokeLLM: jest.fn(), SendEmail: jest.fn() } },
  },
}));

// Access the stable fn references after the mock is registered
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { base44: mockBase44 } = require('@/api/base44Client');
const mockAuthMe      = mockBase44.auth.me;
const mockSubFilter   = mockBase44.entities.UserSubscription.filter;
const mockTrialFilter = mockBase44.entities.PremiumTrial.filter;
const mockSpecialFilter = mockBase44.entities.SpecialAccount.filter;

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function makeFuture(days: number) {
  return new Date(Date.now() + days * 86400_000).toISOString();
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockAuthMe.mockResolvedValue({ id: 'u1', email: 'test@clipforge.com', full_name: 'Test' });
  mockSubFilter.mockResolvedValue([]);
  mockTrialFilter.mockResolvedValue([]);
  mockSpecialFilter.mockResolvedValue([]);
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe('useSubscription — free plan', () => {
  it('returns plan=free when no subscription exists', async () => {
    const { result } = renderHook(() => useSubscription(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plan).toBe('free');
    expect(result.current.isPro).toBe(false);
    expect(result.current.isPremium).toBe(false);
  });
});

describe('useSubscription — paid plans', () => {
  it('isPro=true for pro plan', async () => {
    mockSubFilter.mockResolvedValue([{ plan: 'pro', status: 'active' }]);
    const { result } = renderHook(() => useSubscription(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isPro).toBe(true);
    expect(result.current.isPremium).toBe(false);
  });

  it('isPremium=true for premium plan', async () => {
    mockSubFilter.mockResolvedValue([{ plan: 'premium', status: 'active' }]);
    const { result } = renderHook(() => useSubscription(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isPremium).toBe(true);
    expect(result.current.isPro).toBe(true);
  });

  it('isFamily=true for family plan', async () => {
    mockSubFilter.mockResolvedValue([{ plan: 'family', status: 'active' }]);
    const { result } = renderHook(() => useSubscription(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isFamily).toBe(true);
    expect(result.current.isPremium).toBe(true);
  });
});

describe('useSubscription — trials', () => {
  it('elevates free user to premium during active trial', async () => {
    mockTrialFilter.mockResolvedValue([{
      is_active: true, trial_plan: 'premium', trial_end: makeFuture(3),
    }]);
    const { result } = renderHook(() => useSubscription(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isTrialing).toBe(true);
    expect(result.current.isPremium).toBe(true);
  });

  it('elevates free user to family during family trial', async () => {
    mockTrialFilter.mockResolvedValue([{
      is_active: true, trial_plan: 'family', trial_end: makeFuture(5),
    }]);
    const { result } = renderHook(() => useSubscription(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isTrialing).toBe(true);
    expect(result.current.isFamily).toBe(true);
  });

  it('does NOT elevate when trial is expired', async () => {
    const past = new Date(Date.now() - 1000).toISOString();
    mockTrialFilter.mockResolvedValue([{
      is_active: true, trial_plan: 'premium', trial_end: past,
    }]);
    const { result } = renderHook(() => useSubscription(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isTrialing).toBe(false);
    expect(result.current.plan).toBe('free');
  });
});

describe('useSubscription — debug mode', () => {
  it('overrides plan via localStorage debug tier', async () => {
    localStorage.setItem('cf_debug_mode', 'true');
    localStorage.setItem('cf_debug_tier', 'family');
    const { result } = renderHook(() => useSubscription(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plan).toBe('family');
    expect(result.current.isDebugMode).toBe(true);
  });
});
