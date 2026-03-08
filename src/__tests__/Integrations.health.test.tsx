/**
 * Integrations.health.test.tsx
 * ────────────────────────────────────────────────────────────────────────────
 * Tests for the Health tab in Integrations.jsx.
 *
 * Reality model (2026):
 *   • Apple Health  → iOS-native only, no web API.
 *   • MyFitnessPal  → Private partner API (invite-only).
 *   • Cronometer    → No public API; partner request submitted.
 *
 * We verify:
 *   1.  Each health app card renders with correct name and description.
 *   2.  NO "Connect" / "Disconnect" buttons appear (not a real API).
 *   3.  NO fake "Connected" badge is rendered.
 *   4.  A "Notify Me" button is present per app.
 *   5.  Clicking "Notify Me" calls UserPreferences.upsert (stores interest).
 *   6.  After notification, badge changes to "Notified" and button disappears.
 *   7.  Apple Health card shows "iOS app required" badge.
 *   8.  MFP and Cronometer cards show "Partner pending" badge.
 *   9.  Honest limitation detail text is present per app.
 *   10. "Coming in a future release" warning banner is visible.
 *   11. Spoonacular "available now" card is visible.
 *   12. iOS app teaser card is visible.
 *   13. SocialConnection.create is NEVER called (no fake records).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/api/base44Client', () => ({
  base44: {
    auth: {
      me: jest.fn().mockResolvedValue({ id: 'u1', email: 'colton@test.com' }),
      redirectToLogin: jest.fn().mockResolvedValue({}),
    },
    entities: {
      UserPreferences: {
        list:   jest.fn().mockResolvedValue([{ api_keys: {} }]),
        upsert: jest.fn().mockResolvedValue({}),
      },
      SocialConnection: {
        list:   jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'conn1' }),
        update: jest.fn().mockResolvedValue({}),
        filter: jest.fn().mockResolvedValue([]),
      },
      SavedItem: {
        list:   jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'item1' }),
      },
      UserSubscription:  { filter: jest.fn().mockResolvedValue([]) },
      PremiumTrial:      { filter: jest.fn().mockResolvedValue([]) },
      SpecialAccount:    { filter: jest.fn().mockResolvedValue([]) },
    },
    functions: { invoke: jest.fn().mockResolvedValue({ data: {} }) },
    integrations: { Core: { InvokeLLM: jest.fn().mockResolvedValue({}) } },
  },
}));

const { base44 } = require('@/api/base44Client');

jest.mock('@/utils', () => ({ createPageUrl: (n: string) => `/${n}` }));

jest.mock('@/components/integrations/SocialConnectPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="social-connect-panel" />,
}));
jest.mock('@/components/integrations/StreamingPlatformsPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="streaming-panel" />,
}));
jest.mock('@/components/friends/FindFriendsPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="find-friends-panel" />,
}));

jest.mock('@/components/shared/useSubscription', () => ({
  useSubscription: () => ({
    isPro: true,
    plan: 'premium',
    isPremiumPlan: true,
    isFamily: false,
  }),
}));

import Integrations from '../pages/Integrations';

// ── Setup helpers ─────────────────────────────────────────────────────────────

function buildQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderIntegrations(initialSearch = '?tab=health') {
  const qc = buildQueryClient();
  return render(
    <MemoryRouter initialEntries={[`/Integrations${initialSearch}`]}>
      <QueryClientProvider client={qc}>
        <Integrations />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  // Clear notified state from localStorage before each test
  localStorage.removeItem('cf_health_notified');
  base44.auth.me.mockResolvedValue({ id: 'u1', email: 'colton@test.com' });
  base44.entities.UserPreferences.list.mockResolvedValue([{ api_keys: {} }]);
  base44.entities.UserPreferences.upsert.mockResolvedValue({});
  base44.entities.SocialConnection.list.mockResolvedValue([]);
  base44.entities.SocialConnection.create.mockResolvedValue({ id: 'conn1' });
});

// ── 1. Renders ────────────────────────────────────────────────────────────────

describe('Health tab — renders all app cards', () => {
  it('renders MyFitnessPal card', async () => {
    renderIntegrations();
    expect(await screen.findByText('MyFitnessPal')).toBeInTheDocument();
  });

  it('renders Apple Health card', async () => {
    renderIntegrations();
    expect(await screen.findByText('Apple Health')).toBeInTheDocument();
  });

  it('renders Cronometer card', async () => {
    renderIntegrations();
    expect(await screen.findByText('Cronometer')).toBeInTheDocument();
  });

  it('renders the honest limitation warning banner', async () => {
    renderIntegrations();
    expect(
      await screen.findByText(/health integrations.*coming in a future release/i)
    ).toBeInTheDocument();
  });

  it('renders Spoonacular "available now" card', async () => {
    renderIntegrations();
    expect(
      await screen.findByText(/nutrition data.*available now via spoonacular/i)
    ).toBeInTheDocument();
  });

  it('renders iOS app teaser card', async () => {
    renderIntegrations();
    expect(
      await screen.findByText(/clipforge ios app.*in development/i)
    ).toBeInTheDocument();
  });
});

// ── 2. NO fake connection UI ───────────────────────────────────────────────────

describe('Health tab — no fake connection UI', () => {
  it('does NOT render any "Connect" button for health apps', async () => {
    renderIntegrations();
    await screen.findByText('MyFitnessPal');
    // Should be zero buttons labeled exactly "Connect" in health context
    const connectBtns = screen
      .queryAllByRole('button')
      .filter(b => b.textContent?.trim() === 'Connect');
    expect(connectBtns.length).toBe(0);
  });

  it('does NOT render any "Disconnect" button for health apps', async () => {
    renderIntegrations();
    await screen.findByText('MyFitnessPal');
    const disconnectBtns = screen
      .queryAllByRole('button')
      .filter(b => b.textContent?.trim() === 'Disconnect');
    expect(disconnectBtns.length).toBe(0);
  });

  it('does NOT render a "Connected" badge for any health app', async () => {
    renderIntegrations();
    await screen.findByText('MyFitnessPal');
    // The word "Connected" should not appear as a badge in the health section
    // (there may be a "Notified" badge after clicking but not "Connected")
    const connectedTexts = screen.queryAllByText(/^Connected$/);
    expect(connectedTexts.length).toBe(0);
  });

  it('does NOT call SocialConnection.create for any health app', async () => {
    renderIntegrations();
    await screen.findByText('MyFitnessPal');
    // Wait a tick — no auto-connect should have fired
    await waitFor(() => {}, { timeout: 300 });
    expect(base44.entities.SocialConnection.create).not.toHaveBeenCalled();
  });
});

// ── 3. Status badges ──────────────────────────────────────────────────────────

describe('Health tab — honest status badges', () => {
  it('Apple Health card shows "iOS app required" badge', async () => {
    renderIntegrations();
    expect(await screen.findByText(/iOS app required/i)).toBeInTheDocument();
  });

  it('MyFitnessPal card shows "Partner pending" badge', async () => {
    renderIntegrations();
    const cards = await screen.findAllByText(/Partner pending/i);
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it('Cronometer card shows "Partner pending" badge', async () => {
    renderIntegrations();
    const cards = await screen.findAllByText(/Partner pending/i);
    // MFP + Cronometer = at least 2 partner pending badges
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });
});

// ── 4. Limitation detail text ─────────────────────────────────────────────────

describe('Health tab — limitation details', () => {
  it('Apple Health card mentions iOS-native limitation', async () => {
    renderIntegrations();
    expect(
      await screen.findByText(/HealthKit is iOS-native only/i)
    ).toBeInTheDocument();
  });

  it('MyFitnessPal card mentions private partner API', async () => {
    renderIntegrations();
    expect(
      await screen.findByText(/MFP.*invite-only/i)
    ).toBeInTheDocument();
  });

  it('Cronometer card mentions no public API', async () => {
    renderIntegrations();
    expect(
      await screen.findByText(/No public API/i)
    ).toBeInTheDocument();
  });
});

// ── 5. Notify Me flow ─────────────────────────────────────────────────────────

describe('Health tab — Notify Me flow', () => {
  it('each health app has a Notify Me button initially', async () => {
    renderIntegrations();
    await screen.findByText('MyFitnessPal');
    const notifyBtns = screen.queryAllByRole('button', { name: /notify me/i });
    expect(notifyBtns.length).toBe(3); // MFP + Apple Health + Cronometer
  });

  it('clicking Notify Me on MyFitnessPal calls UserPreferences.upsert', async () => {
    renderIntegrations();
    const btn = await screen.findByTestId('health-notify-myfitnesspal');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(base44.entities.UserPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          health_notify_interests: expect.arrayContaining(['myfitnesspal']),
        })
      );
    });
  });

  it('after clicking Notify Me, the button disappears and "Notified" badge appears', async () => {
    renderIntegrations();
    const btn = await screen.findByTestId('health-notify-myfitnesspal');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.queryByTestId('health-notify-myfitnesspal')).not.toBeInTheDocument();
    });
    expect(await screen.findAllByText(/Notified/i)).not.toHaveLength(0);
  });

  it('clicking Notify Me on Apple Health calls upsert with apple_health', async () => {
    renderIntegrations();
    const btn = await screen.findByTestId('health-notify-apple_health');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(base44.entities.UserPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          health_notify_interests: expect.arrayContaining(['apple_health']),
        })
      );
    });
  });

  it('clicking Notify Me on Cronometer calls upsert with cronometer', async () => {
    renderIntegrations();
    const btn = await screen.findByTestId('health-notify-cronometer');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(base44.entities.UserPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          health_notify_interests: expect.arrayContaining(['cronometer']),
        })
      );
    });
  });

  it('notify state persists via localStorage', async () => {
    // Pre-set localStorage as if user already clicked Notify Me for MFP
    localStorage.setItem('cf_health_notified', JSON.stringify({ myfitnesspal: true }));
    renderIntegrations();
    await screen.findByText('MyFitnessPal');
    // MFP button should be gone (already notified)
    expect(screen.queryByTestId('health-notify-myfitnesspal')).not.toBeInTheDocument();
    // Apple Health and Cronometer buttons should still be present
    expect(await screen.findByTestId('health-notify-apple_health')).toBeInTheDocument();
    expect(await screen.findByTestId('health-notify-cronometer')).toBeInTheDocument();
  });

  it('notifying all three apps accumulates all IDs', async () => {
    renderIntegrations();
    await screen.findByText('MyFitnessPal');
    fireEvent.click(screen.getByTestId('health-notify-myfitnesspal'));
    await waitFor(() => expect(screen.queryByTestId('health-notify-myfitnesspal')).not.toBeInTheDocument());

    fireEvent.click(screen.getByTestId('health-notify-apple_health'));
    await waitFor(() => expect(screen.queryByTestId('health-notify-apple_health')).not.toBeInTheDocument());

    fireEvent.click(screen.getByTestId('health-notify-cronometer'));
    await waitFor(() => expect(screen.queryByTestId('health-notify-cronometer')).not.toBeInTheDocument());

    // All three Notified badges should be present
    const notifiedBadges = screen.queryAllByText(/Notified/i);
    expect(notifiedBadges.length).toBeGreaterThanOrEqual(3);
  });
});
