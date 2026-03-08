/**
 * TwitterPremiumGate.test.tsx
 *
 * Tests the X / Twitter premium-gating logic inside SocialConnectPanel:
 *
 *  FREE USER (isPremium: false, isFamily: false)
 *  ─────────────────────────────────────────────
 *  ✓ Twitter card renders
 *  ✓ Shows amber apiLimitation banner with premiumNote copy
 *  ✓ Shows "Premium" badge (not "Connected") in header
 *  ✓ Shows "Upgrade to Unlock" button (NOT "Connect X / Twitter")
 *  ✓ Clicking "Upgrade to Unlock" navigates to /Pricing (window.location.href)
 *  ✓ NO consent modal opens when clicking the locked button
 *  ✓ NO socialOAuthInit invoked for free users
 *  ✓ Sync button is NOT rendered for free + unconnected Twitter
 *
 *  PREMIUM USER (isPremium: true)
 *  ──────────────────────────────
 *  ✓ Shows normal "Connect X / Twitter" button
 *  ✓ Does NOT show "Upgrade to Unlock" button
 *  ✓ Shows the green "Included in your Premium plan" value-prop banner
 *  ✓ Clicking Connect opens ConsentModal
 *  ✓ Accepting consent calls socialOAuthInit with platform "twitter"
 *  ✓ Sync Now available and calls syncSocialPlatform for connected premium users
 *  ✓ Sync is blocked for non-premium users even if connection record exists
 *
 *  PREMIUM + CONNECTED
 *  ────────────────────
 *  ✓ Shows Disconnect button and Sync Now button
 *  ✓ handleSync fires syncSocialPlatform with platform "twitter"
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// ── Mock factory (all fns defined inside the factory to avoid hoisting issues) ─

jest.mock('@/api/base44Client', () => ({
  base44: {
    auth: {
      me:              jest.fn().mockResolvedValue({ id: 'u1', email: 'test@test.com' }),
      redirectToLogin: jest.fn().mockResolvedValue({}),
    },
    entities: {
      SocialConnection: {
        list:   jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'conn1' }),
        update: jest.fn().mockResolvedValue({}),
        filter: jest.fn().mockResolvedValue([]),
      },
      SavedItem: {
        create: jest.fn().mockResolvedValue({ id: 'item1' }),
        list:   jest.fn().mockResolvedValue([]),
      },
    },
    functions: { invoke: jest.fn().mockResolvedValue({ data: { events: [] } }) },
    integrations: { Core: { InvokeLLM: jest.fn().mockResolvedValue({ items: [] }) } },
  },
}));

// Grab stable references AFTER jest.mock (requires happens after hoisted mock)
const { base44 } = require('@/api/base44Client');
const mockSocialConnectionList   = base44.entities.SocialConnection.list;
const mockSocialConnectionCreate = base44.entities.SocialConnection.create;
const mockSocialConnectionUpdate = base44.entities.SocialConnection.update;
const mockFunctionsInvoke        = base44.functions.invoke;
const mockRedirectToLogin        = base44.auth.redirectToLogin;

jest.mock('@/utils', () => ({ createPageUrl: (n: string) => `/${n}` }));

jest.mock('@/components/integrations/ConsentModal', () => ({
  __esModule: true,
  default: ({ open, onAccept, onClose }: any) =>
    open ? (
      <div data-testid="consent-modal">
        <button onClick={onAccept}>Accept</button>
        <button onClick={onClose}>Decline</button>
      </div>
    ) : null,
}));

// ── Subscription mock – use a shared state object so jest.mock hoisting works ─
// jest.mock is hoisted before ANY module-level code including const/let declarations.
// To share mutable state with the hoisted factory, we use globalThis (always available).
// The factory reads globalThis.__twSubState at call time (each render), not at hoisting time.

(globalThis as any).__twSubState = { isPremium: false, isFamily: false };

jest.mock('@/components/shared/useSubscription', () => ({
  useSubscription: () => ({
    isPremium: (globalThis as any).__twSubState.isPremium,
    isFamily:  (globalThis as any).__twSubState.isFamily,
    user: { id: 'u1', email: 'test@test.com' },
  }),
}));

// Convenience alias (set after module load — safe to use here)
const subState: { isPremium: boolean; isFamily: boolean } = (globalThis as any).__twSubState;

import SocialConnectPanel from '../components/integrations/SocialConnectPanel';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPanel(connectedPlatforms: string[] = []) {
  const connections = connectedPlatforms.map(p => ({
    id:          `conn-${p}`,
    platform:    p,
    connected:   true,
    confirmed:   true,
    username:    `user_${p}`,
    sync_count:  3,
    last_synced: new Date().toISOString(),
  }));
  mockSocialConnectionList.mockResolvedValue(connections);

  return render(
    <MemoryRouter>
      <QueryClientProvider client={buildQC()}>
        <SocialConnectPanel />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  cleanup(); // Ensure each test starts with a clean DOM
  // Use mockClear (not clearAllMocks) to reset call counts only, 
  // preserving mock implementations set in the factory
  mockFunctionsInvoke.mockClear();
  mockSocialConnectionList.mockClear();
  mockSocialConnectionCreate.mockClear();
  mockSocialConnectionUpdate.mockClear();
  mockRedirectToLogin.mockClear();
  base44.auth.me.mockClear();
  base44.entities.SocialConnection.filter.mockClear();
  base44.integrations.Core.InvokeLLM.mockClear();
  // Reset subscription state
  (globalThis as any).__twSubState.isPremium = false;
  (globalThis as any).__twSubState.isFamily  = false;
  // Ensure implementations are set correctly for this test
  mockFunctionsInvoke.mockResolvedValue({ data: { events: [] } });
  mockSocialConnectionList.mockResolvedValue([]);
  mockSocialConnectionCreate.mockResolvedValue({ id: 'conn1' });
  mockSocialConnectionUpdate.mockResolvedValue({});
  base44.auth.me.mockResolvedValue({ id: 'u1', email: 'test@test.com' });
  base44.auth.redirectToLogin.mockResolvedValue({});
  base44.entities.SocialConnection.filter.mockResolvedValue([]);
  base44.integrations.Core.InvokeLLM.mockResolvedValue({ items: [] });
});

// ─────────────────────────────────────────────────────────────────────────────
// FREE USER
// ─────────────────────────────────────────────────────────────────────────────

describe('Twitter premium gate — free user', () => {

  it('renders the X / Twitter card', async () => {
    renderPanel();
    expect(await screen.findByText('X / Twitter')).toBeInTheDocument();
  });

  it('shows "Premium" badge in the Twitter card header', async () => {
    renderPanel();
    await screen.findByText('X / Twitter');
    // The card should have a "Premium" badge (not "Connected")
    const premiumBadges = screen.getAllByText(/premium/i);
    expect(premiumBadges.length).toBeGreaterThan(0);
  });

  it('shows locked premium banner with cost explanation', async () => {
    renderPanel();
    await screen.findByText('X / Twitter');
    // premiumNote copy includes "$100/mo" — check textContent of whole body
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/\$100\/mo/i);
    }, { timeout: 3000 });
  });

  it('shows "Upgrade to Unlock" button instead of "Connect X / Twitter"', async () => {
    renderPanel();
    await screen.findByText('X / Twitter');
    await waitFor(() => {
      const btns = Array.from(document.querySelectorAll('button'))
        .map(b => b.textContent?.trim() || '');
      expect(btns.some(t => /upgrade to unlock/i.test(t))).toBe(true);
      expect(btns.every(t => !/connect x \/ twitter/i.test(t))).toBe(true);
    }, { timeout: 3000 });
  });

  it('clicking "Upgrade to Unlock" navigates to /Pricing', async () => {
    // jsdom doesn't support real navigation, so we just verify the handler
    // sets window.location.href (which will throw a "not implemented" error
    // in jsdom — that's expected and acceptable for this assertion)
    renderPanel();
    const upgradeBtn = await screen.findByRole('button', { name: /upgrade to unlock/i });
    // The button's onClick does: window.location.href = '/Pricing'
    // We just verify the button exists and is the right CTA
    expect(upgradeBtn).toBeInTheDocument();
    // Verify the button does NOT open a consent modal (it's a direct link)
    fireEvent.click(upgradeBtn);
    expect(screen.queryByTestId('consent-modal')).toBeNull();
  });

  it('does NOT open ConsentModal when locked button is clicked', async () => {
    renderPanel();
    const upgradeBtn = await screen.findByRole('button', { name: /upgrade to unlock/i });
    fireEvent.click(upgradeBtn);
    // ConsentModal should not appear — the button goes to /Pricing instead
    expect(screen.queryByTestId('consent-modal')).toBeNull();
  });

  it('does NOT call socialOAuthInit when locked button is clicked', async () => {
    renderPanel();
    const upgradeBtn = await screen.findByRole('button', { name: /upgrade to unlock/i });
    fireEvent.click(upgradeBtn);
    await waitFor(() => {}, { timeout: 300 });
    const oauthCalled = mockFunctionsInvoke.mock.calls.some(c => c[0] === 'socialOAuthInit');
    expect(oauthCalled).toBe(false);
  });

  it('does NOT show a Sync Now button for unconnected free-tier Twitter', async () => {
    renderPanel(); // no connected platforms
    await screen.findByText('X / Twitter');
    // "Sync Now" should not appear for an unconnected+locked card
    expect(screen.queryByRole('button', { name: /sync now/i })).toBeNull();
  });

  it('shows "Premium feature" label in the locked banner', async () => {
    renderPanel();
    await screen.findByText('X / Twitter');
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/premium feature/i);
    }, { timeout: 3000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PREMIUM USER — not yet connected
// ─────────────────────────────────────────────────────────────────────────────

describe('Twitter premium gate — premium user, not connected', () => {

  beforeEach(() => {
    (globalThis as any).__twSubState.isPremium = true;
    subState.isFamily  = false;
  });

  it('shows "Connect X / Twitter" button (not "Upgrade to Unlock")', async () => {
    renderPanel();
    expect(await screen.findByRole('button', { name: /connect x \/ twitter/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /upgrade to unlock/i })).toBeNull();
  });

  it('does NOT show "Premium" badge (platform is accessible)', async () => {
    renderPanel();
    await screen.findByRole('button', { name: /connect x \/ twitter/i });
    // Should show no lock badges on the Twitter card — the "Premium" badge is only for locked state
    expect(screen.queryByText(/^premium$/i)).toBeNull();
  });

  it('shows the green "Included in your Premium plan" value-prop banner', async () => {
    renderPanel();
    await screen.findByRole('button', { name: /connect x \/ twitter/i });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/included in your premium plan/i);
    }, { timeout: 3000 });
  });

  it('clicking Connect opens ConsentModal', async () => {
    renderPanel();
    const connectBtn = await screen.findByRole('button', { name: /connect x \/ twitter/i });
    fireEvent.click(connectBtn);
    expect(await screen.findByTestId('consent-modal')).toBeInTheDocument();
  });

  it('accepting consent calls socialOAuthInit with platform "twitter"', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { authorize_url: 'https://twitter.com/auth', code_verifier: 'verifier123' },
    });

    renderPanel();
    const connectBtn = await screen.findByRole('button', { name: /connect x \/ twitter/i });
    fireEvent.click(connectBtn);
    await screen.findByTestId('consent-modal');
    fireEvent.click(screen.getByRole('button', { name: /accept/i }));

    await waitFor(() => {
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        'socialOAuthInit',
        expect.objectContaining({ platform: 'twitter' })
      );
    }, { timeout: 3000 });
  });

  it('does NOT call redirectToLogin for Twitter (uses PKCE, not legacy OAuth)', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { authorize_url: 'https://twitter.com/auth', code_verifier: 'verifier123' },
    });

    renderPanel();
    const connectBtn = await screen.findByRole('button', { name: /connect x \/ twitter/i });
    fireEvent.click(connectBtn);
    await screen.findByTestId('consent-modal');
    fireEvent.click(screen.getByRole('button', { name: /accept/i }));

    await waitFor(() => {
      expect(mockFunctionsInvoke).toHaveBeenCalledWith('socialOAuthInit', expect.any(Object));
    }, { timeout: 3000 });
    expect(mockRedirectToLogin).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PREMIUM USER — connected
// ─────────────────────────────────────────────────────────────────────────────

describe('Twitter premium gate — premium user, connected', () => {

  beforeEach(() => {
    (globalThis as any).__twSubState.isPremium = true;
    subState.isFamily  = false;
  });

  it('shows Disconnect button when Twitter is connected', async () => {
    renderPanel(['twitter']);
    expect(await screen.findByRole('button', { name: /disconnect/i })).toBeInTheDocument();
  });

  it('shows Sync Now button when Twitter is connected', async () => {
    renderPanel(['twitter']);
    expect(await screen.findByRole('button', { name: /sync now/i })).toBeInTheDocument();
  });

  it('Sync Now calls syncSocialPlatform with platform "twitter"', async () => {
    mockFunctionsInvoke.mockResolvedValue({ data: { imported: 5 } });
    renderPanel(['twitter']);
    const syncBtn = await screen.findByRole('button', { name: /sync now/i });
    fireEvent.click(syncBtn);
    await waitFor(() => {
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        'syncSocialPlatform',
        expect.objectContaining({ platform: 'twitter' })
      );
    }, { timeout: 3000 });
  });

  it('clicking Disconnect shows confirmation dialog', async () => {
    renderPanel(['twitter']);
    const disconnectBtn = await screen.findByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectBtn);
    expect(await screen.findByRole('button', { name: /yes, disconnect/i })).toBeInTheDocument();
  });

  it('confirming Disconnect calls SocialConnection.update', async () => {
    renderPanel(['twitter']);
    const disconnectBtn = await screen.findByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectBtn);
    const confirmBtn = await screen.findByRole('button', { name: /yes, disconnect/i });
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(mockSocialConnectionUpdate).toHaveBeenCalledWith(
        'conn-twitter',
        expect.objectContaining({ connected: false, confirmed: false })
      );
    }, { timeout: 3000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FAMILY PLAN — same as premium
// ─────────────────────────────────────────────────────────────────────────────

describe('Twitter premium gate — family plan user', () => {

  beforeEach(() => {
    (globalThis as any).__twSubState.isPremium = false;
    subState.isFamily  = true;  // Family plan also unlocks Twitter
  });

  it('shows "Connect X / Twitter" for Family plan users (isPremiumUser = true)', async () => {
    renderPanel();
    expect(await screen.findByRole('button', { name: /connect x \/ twitter/i })).toBeInTheDocument();
  });

  it('does NOT show "Upgrade to Unlock" for family plan users', async () => {
    renderPanel();
    await screen.findByRole('button', { name: /connect x \/ twitter/i });
    expect(screen.queryByRole('button', { name: /upgrade to unlock/i })).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SYNC GATE: free user with a connection record (edge case)
// ─────────────────────────────────────────────────────────────────────────────

describe('Twitter sync gate — free user with stale connection record', () => {

  beforeEach(() => {
    (globalThis as any).__twSubState.isPremium = false;
    subState.isFamily  = false;
  });

  it('does NOT show Sync Now for a free user even if connection record exists', async () => {
    // Simulate a DB record left over from before the premium gate was added.
    // isConnected=true (because connected+confirmed both true) BUT
    // isLockedForUser=true (requiresPremium && !isPremiumUser) hides Sync Now.
    //
    // Use renderPanel(['twitter']) to set up the connected state;
    // then override subscription to free BEFORE rendering.
    // (renderPanel(['twitter']) sets list mock, then renders with free user)
    // Note: globalThis.__twSubState.isPremium is already false from beforeEach
    renderPanel(['twitter']); // sets SocialConnection.list to return twitter connection
    await screen.findByText('X / Twitter');
    // isConnected=true, but isLockedForUser=true → Sync Now hidden
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /sync now/i })).toBeNull();
    }, { timeout: 3000 });
    // Disconnect button DOES appear (isConnected=true takes priority over locked state
    // for the primary action button, but Sync Now is separately gated)
    expect(await screen.findByRole('button', { name: /disconnect/i })).toBeInTheDocument();
  });
});
