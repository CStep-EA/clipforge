/**
 * Integrations.shopping.test.tsx
 * ────────────────────────────────────────────────────────────────────────────
 * Tests for the Shopping tab in Integrations.jsx covering:
 *
 * Amazon Product Lookup
 *   A1. Card renders with "Connect Amazon" button when not enabled.
 *   A2. Clicking "Connect Amazon" opens the credentials form (not instantly active).
 *   A3. Credentials form shows Access Key, Secret Key, and Associate Tag inputs.
 *   A4. Save button is disabled / shows error toast if any field is empty.
 *   A5. Filling all three fields and clicking Save calls UserPreferences.upsert.
 *   A6. Successful save shows "Active" badge + Connected status.
 *   A7. Saving persists data: form disappears, active summary shows.
 *   A8. "Edit credentials" pre-fills the draft with existing saved values.
 *   A9. "Disconnect" button clears credentials and resets to Connect state.
 *   A10. No credentials are saved on keystrokes (only on Save click).
 *
 * Ticketmaster
 *   T1. Card renders with "Active" badge.
 *   T2. Card describes live event discovery.
 *
 * Groupon & RetailMeNot (Coming Soon)
 *   G1. Groupon card renders with correct ETA.
 *   G2. RetailMeNot card renders with correct ETA.
 *   G3. "Coming Soon" buttons are disabled.
 *   G4. Coming Soon section heading is visible.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderShopping() {
  const qc = buildQC();
  return render(
    <MemoryRouter initialEntries={['/Integrations?tab=shopping']}>
      <QueryClientProvider client={qc}>
        <Integrations />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.removeItem('cf_api_keys');
  base44.auth.me.mockResolvedValue({ id: 'u1', email: 'colton@test.com' });
  // Default: no saved keys → Amazon not enabled
  base44.entities.UserPreferences.list.mockResolvedValue([{ api_keys: {} }]);
  base44.entities.UserPreferences.upsert.mockResolvedValue({});
  base44.entities.SocialConnection.list.mockResolvedValue([]);
});

// ── Amazon — initial state ────────────────────────────────────────────────────

describe('Amazon Product Lookup — initial state', () => {
  it('A1: renders "Connect Amazon" button when not yet enabled', async () => {
    renderShopping();
    expect(await screen.findByRole('button', { name: /connect amazon/i })).toBeInTheDocument();
  });

  it('A1: does NOT show Active badge INSIDE the Amazon card when not enabled', async () => {
    renderShopping();
    await screen.findByRole('button', { name: /connect amazon/i });
    // The Amazon card is the one containing the "Connect Amazon" button.
    // It should NOT have an Active badge at this point.
    const connectBtn = screen.getByRole('button', { name: /connect amazon/i });
    // Walk up to the card container
    const amazonCard = connectBtn.closest('[class*="glass-card"]') ?? connectBtn.parentElement;
    expect(amazonCard).toBeTruthy();
    // The card itself should not contain "Active" text (that would mean a false positive)
    expect(amazonCard!.textContent).not.toMatch(/\bActive\b/);
  });

  it('A1: shows informational text about what it does', async () => {
    renderShopping();
    expect(
      await screen.findByText(/product title, price, image, and deals/i)
    ).toBeInTheDocument();
  });

  it('A1: shows encrypted credentials notice', async () => {
    renderShopping();
    expect(
      await screen.findByText(/credentials are encrypted/i)
    ).toBeInTheDocument();
  });
});

// ── Amazon — opening credentials form ────────────────────────────────────────

describe('Amazon Product Lookup — opening credentials form', () => {
  it('A2: clicking "Connect Amazon" opens credentials form', async () => {
    renderShopping();
    const btn = await screen.findByRole('button', { name: /connect amazon/i });
    fireEvent.click(btn);
    expect(await screen.findByText('API Credentials')).toBeInTheDocument();
  });

  it('A3: credentials form shows Access Key ID input', async () => {
    renderShopping();
    fireEvent.click(await screen.findByRole('button', { name: /connect amazon/i }));
    expect(await screen.findByPlaceholderText(/paste your access key id/i)).toBeInTheDocument();
  });

  it('A3: credentials form shows Secret Key input', async () => {
    renderShopping();
    fireEvent.click(await screen.findByRole('button', { name: /connect amazon/i }));
    expect(await screen.findByPlaceholderText(/paste your secret key/i)).toBeInTheDocument();
  });

  it('A3: credentials form shows Associate Tag input', async () => {
    renderShopping();
    fireEvent.click(await screen.findByRole('button', { name: /connect amazon/i }));
    expect(await screen.findByPlaceholderText(/yourtag-20/i)).toBeInTheDocument();
  });

  it('A3: credentials form shows link to Amazon Associates', async () => {
    renderShopping();
    fireEvent.click(await screen.findByRole('button', { name: /connect amazon/i }));
    expect(await screen.findByText(/amazon associates/i)).toBeInTheDocument();
  });

  it('A10: UserPreferences.upsert is NOT called on keystroke (only on Save)', async () => {
    renderShopping();
    fireEvent.click(await screen.findByRole('button', { name: /connect amazon/i }));
    const accessInput = await screen.findByPlaceholderText(/paste your access key id/i);
    fireEvent.change(accessInput, { target: { value: 'AKIATEST1234' } });
    // No immediate save call
    await waitFor(() => {}, { timeout: 200 });
    expect(base44.entities.UserPreferences.upsert).not.toHaveBeenCalled();
  });
});

// ── Amazon — validation ───────────────────────────────────────────────────────

describe('Amazon Product Lookup — save validation', () => {
  async function openForm() {
    renderShopping();
    fireEvent.click(await screen.findByRole('button', { name: /connect amazon/i }));
    await screen.findByText('API Credentials');
  }

  it('A4: Save button exists in the form', async () => {
    await openForm();
    expect(screen.getByRole('button', { name: /save & enable amazon lookup/i })).toBeInTheDocument();
  });

  it('A4: clicking Save with all fields empty does NOT call upsert', async () => {
    await openForm();
    fireEvent.click(screen.getByRole('button', { name: /save & enable amazon lookup/i }));
    await waitFor(() => {}, { timeout: 300 });
    expect(base44.entities.UserPreferences.upsert).not.toHaveBeenCalled();
  });

  it('A4: clicking Save with only access key filled does NOT call upsert', async () => {
    await openForm();
    fireEvent.change(screen.getByPlaceholderText(/paste your access key id/i), {
      target: { value: 'AKIATEST1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save & enable amazon lookup/i }));
    await waitFor(() => {}, { timeout: 300 });
    expect(base44.entities.UserPreferences.upsert).not.toHaveBeenCalled();
  });
});

// ── Amazon — successful save ──────────────────────────────────────────────────

describe('Amazon Product Lookup — successful save', () => {
  async function fillAndSave() {
    renderShopping();
    fireEvent.click(await screen.findByRole('button', { name: /connect amazon/i }));
    await screen.findByText('API Credentials');

    fireEvent.change(screen.getByPlaceholderText(/paste your access key id/i), {
      target: { value: 'AKIATEST1234' },
    });
    fireEvent.change(screen.getByPlaceholderText(/paste your secret key/i), {
      target: { value: 'secretKeyValue' },
    });
    fireEvent.change(screen.getByPlaceholderText(/yourtag-20/i), {
      target: { value: 'mytag-20' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save & enable amazon lookup/i }));
  }

  it('A5: filling all fields and clicking Save calls UserPreferences.upsert', async () => {
    await fillAndSave();
    await waitFor(() => {
      expect(base44.entities.UserPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          api_keys: expect.objectContaining({
            amazon_access_key: 'AKIATEST1234',
            amazon_secret_key: 'secretKeyValue',
            amazon_tag: 'mytag-20',
          }),
        })
      );
    });
  });

  it('A5: upsert is called with trimmed values', async () => {
    renderShopping();
    fireEvent.click(await screen.findByRole('button', { name: /connect amazon/i }));
    await screen.findByText('API Credentials');

    fireEvent.change(screen.getByPlaceholderText(/paste your access key id/i), {
      target: { value: '  AKIA_PADDED  ' },
    });
    fireEvent.change(screen.getByPlaceholderText(/paste your secret key/i), {
      target: { value: '  secretVal  ' },
    });
    fireEvent.change(screen.getByPlaceholderText(/yourtag-20/i), {
      target: { value: '  padded-20  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save & enable amazon lookup/i }));

    await waitFor(() => {
      expect(base44.entities.UserPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          api_keys: expect.objectContaining({
            amazon_access_key: 'AKIA_PADDED',
            amazon_tag: 'padded-20',
          }),
        })
      );
    });
  });

  it('A6: after save, "Active" badge appears', async () => {
    await fillAndSave();
    expect(await screen.findByText('Active')).toBeInTheDocument();
  });

  it('A7: after save, credentials form is hidden', async () => {
    await fillAndSave();
    await waitFor(() => {
      expect(screen.queryByText('API Credentials')).not.toBeInTheDocument();
    });
  });

  it('A7: after save, connected summary text appears', async () => {
    await fillAndSave();
    expect(
      await screen.findByText(/connected.*product lookup is running/i)
    ).toBeInTheDocument();
  });
});

// ── Amazon — edit credentials ─────────────────────────────────────────────────

describe('Amazon Product Lookup — edit credentials (pre-fill)', () => {
  it('A8: pre-fills draft when "Edit credentials" is clicked', async () => {
    // Simulate Amazon already enabled (keys loaded from UserPreferences)
    base44.entities.UserPreferences.list.mockResolvedValue([{
      api_keys: {
        amazon_access_key: 'EXISTINGKEY',
        amazon_secret_key: 'EXISTINGSECRET',
        amazon_tag: 'existing-20',
      },
    }]);
    renderShopping();
    // Wait for the active state to render
    const editBtn = await screen.findByText(/edit credentials/i);
    fireEvent.click(editBtn);
    // Should have pre-filled inputs
    const accessInput = await screen.findByPlaceholderText(/paste your access key id/i);
    expect((accessInput as HTMLInputElement).value).toBe('EXISTINGKEY');
  });
});

// ── Amazon — disconnect ───────────────────────────────────────────────────────

describe('Amazon Product Lookup — disconnect', () => {
  it('A9: shows Disconnect button when Amazon is active', async () => {
    base44.entities.UserPreferences.list.mockResolvedValue([{
      api_keys: {
        amazon_access_key: 'ACTIVEKEY',
        amazon_secret_key: 'ACTIVESECRET',
        amazon_tag: 'active-20',
      },
    }]);
    renderShopping();
    expect(await screen.findByRole('button', { name: /disconnect/i })).toBeInTheDocument();
  });

  it('A9: clicking Disconnect calls upsert with empty keys', async () => {
    base44.entities.UserPreferences.list.mockResolvedValue([{
      api_keys: {
        amazon_access_key: 'ACTIVEKEY',
        amazon_secret_key: 'ACTIVESECRET',
        amazon_tag: 'active-20',
      },
    }]);
    renderShopping();
    const disconnectBtn = await screen.findByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectBtn);
    await waitFor(() => {
      expect(base44.entities.UserPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          api_keys: expect.objectContaining({
            amazon_access_key: '',
            amazon_secret_key: '',
            amazon_tag: '',
          }),
        })
      );
    });
  });

  it('A9: after Disconnect, "Connect Amazon" button returns', async () => {
    base44.entities.UserPreferences.list.mockResolvedValue([{
      api_keys: {
        amazon_access_key: 'ACTIVEKEY',
        amazon_secret_key: 'ACTIVESECRET',
        amazon_tag: 'active-20',
      },
    }]);
    renderShopping();
    const disconnectBtn = await screen.findByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectBtn);
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /connect amazon/i })
      ).toBeInTheDocument();
    });
  });
});

// ── Ticketmaster ──────────────────────────────────────────────────────────────

describe('Ticketmaster card', () => {
  it('T1: renders Ticketmaster card with Active badge', async () => {
    renderShopping();
    expect(await screen.findByText('Ticketmaster API')).toBeInTheDocument();
    // Should show "Active" for Ticketmaster — look for it inside the card
    const activeBadges = await screen.findAllByText('Active');
    expect(activeBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('T2: describes live event discovery', async () => {
    renderShopping();
    expect(
      await screen.findByText(/real event discovery.*ticketmaster discovery api/i)
    ).toBeInTheDocument();
  });

  it('T2: shows API key configured notice', async () => {
    renderShopping();
    expect(
      await screen.findByText(/api key configured securely as a server secret/i)
    ).toBeInTheDocument();
  });
});

// ── Coming Soon: Groupon & RetailMeNot ────────────────────────────────────────

describe('Coming Soon section — Groupon & RetailMeNot', () => {
  it('G4: "Coming Soon — Deals & Coupons" heading is visible', async () => {
    renderShopping();
    expect(
      await screen.findByText(/coming soon.*deals.*coupons/i)
    ).toBeInTheDocument();
  });

  it('G1: Groupon card renders', async () => {
    renderShopping();
    expect(await screen.findByText('Groupon')).toBeInTheDocument();
  });

  it('G1: Groupon card shows Q3 2026 ETA', async () => {
    renderShopping();
    const etaBadges = await screen.findAllByText(/Q3 2026/i);
    expect(etaBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('G2: RetailMeNot card renders', async () => {
    renderShopping();
    expect(await screen.findByText('RetailMeNot')).toBeInTheDocument();
  });

  it('G2: RetailMeNot card shows Q3 2026 ETA', async () => {
    renderShopping();
    const etaBadges = await screen.findAllByText(/Q3 2026/i);
    expect(etaBadges.length).toBeGreaterThanOrEqual(2); // Groupon + RetailMeNot
  });

  it('G3: Groupon "Coming" button is disabled', async () => {
    renderShopping();
    await screen.findByText('Groupon');
    const comingBtns = screen
      .queryAllByRole('button')
      .filter(b => b.textContent?.includes('Coming'));
    expect(comingBtns.length).toBeGreaterThan(0);
    comingBtns.forEach(btn => expect(btn).toBeDisabled());
  });
});
