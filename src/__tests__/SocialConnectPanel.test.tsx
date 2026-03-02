/**
 * SocialConnectPanel.test.tsx
 * Tests for the zero-config OAuth social connect panel:
 *   - Renders platform cards (Instagram, Facebook, TikTok, etc.)
 *   - NO "API Access Token" / password inputs visible anywhere
 *   - NO "Paste your API token" text visible
 *   - Connect button triggers OAuth confirmation dialog (not token dialog)
 *   - Confirmation dialog shows security assurance message
 *   - "Continue to <Platform>" button calls handleOAuthConnect
 *   - Connected state shows reconnect button, sync button
 *   - Sync button calls AI simulation
 *   - Auto-sync toggle requires premium
 *   - Coming Soon section rendered
 *   - Ticketmaster event discovery rendered
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/api/base44Client', () => ({
  base44: {
    auth: {
      me: jest.fn().mockResolvedValue({ id: 'u1', email: 'test@test.com' }),
      redirectToLogin: jest.fn().mockResolvedValue({}),
    },
    entities: {
      SocialConnection: {
        list:   jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'conn1' }),
        update: jest.fn().mockResolvedValue({}),
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

const { base44 } = require('@/api/base44Client');

jest.mock('@/utils', () => ({ createPageUrl: (n: string) => `/${n}` }));

// Mock ConsentModal to avoid Radix portal issues
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

jest.mock('@/components/shared/useSubscription', () => ({
  useSubscription: () => ({ isPremium: false, isFamily: false }),
}));

import SocialConnectPanel from '../components/integrations/SocialConnectPanel';

function renderPanel(connectedPlatforms: string[] = []) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  // Mock SocialConnection.list to return connected/unconnected state
  const connections = connectedPlatforms.map(p => ({
    id: `conn-${p}`,
    platform: p,
    connected: true,
    username: `user_${p}`,
    sync_count: 5,
    last_synced: new Date().toISOString(),
  }));
  base44.entities.SocialConnection.list.mockResolvedValue(connections);

  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <SocialConnectPanel />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  base44.auth.redirectToLogin.mockResolvedValue({});
  base44.entities.SocialConnection.list.mockResolvedValue([]);
  base44.entities.SocialConnection.create.mockResolvedValue({ id: 'conn1' });
  base44.entities.SocialConnection.update.mockResolvedValue({});
});

// ── Render ────────────────────────────────────────────────────────────────────

describe('SocialConnectPanel – render', () => {
  it('renders Instagram platform card', async () => {
    renderPanel();
    expect(await screen.findByText('Instagram')).toBeInTheDocument();
  });

  it('renders Facebook platform card', async () => {
    renderPanel();
    expect(await screen.findByText('Facebook')).toBeInTheDocument();
  });

  it('renders TikTok platform card', async () => {
    renderPanel();
    expect(await screen.findByText('TikTok')).toBeInTheDocument();
  });

  it('renders Ticketmaster Event Discovery section', async () => {
    renderPanel();
    expect(await screen.findByText(/ticketmaster event discovery/i)).toBeInTheDocument();
  });

  it('renders Coming Soon section', async () => {
    renderPanel();
    const matches = await screen.findAllByText(/coming soon/i);
    expect(matches.length).toBeGreaterThan(0);
  });
});

// ── Zero API tokens ───────────────────────────────────────────────────────────

describe('SocialConnectPanel – NO API tokens', () => {
  it('shows NO password input fields', async () => {
    renderPanel();
    await screen.findByText('Instagram');
    const pwInputs = document.querySelectorAll('input[type="password"]');
    expect(pwInputs.length).toBe(0);
  });

  it('does NOT show "API Access Token" label', async () => {
    renderPanel();
    await screen.findByText('Instagram');
    expect(screen.queryByText(/api access token/i)).toBeNull();
  });

  it('does NOT show "Paste your API token" text', async () => {
    renderPanel();
    await screen.findByText('Instagram');
    expect(screen.queryByText(/paste your api token/i)).toBeNull();
  });

  it('does NOT show "developer portal" instructions', async () => {
    renderPanel();
    await screen.findByText('Instagram');
    expect(screen.queryByText(/developer portal/i)).toBeNull();
  });

  it('shows OAuth security assurance message instead', async () => {
    renderPanel();
    expect(await screen.findByText(/one tap to connect/i)).toBeInTheDocument();
  });
});

// ── Connect flow ──────────────────────────────────────────────────────────────

describe('SocialConnectPanel – connect flow', () => {
  it('clicking Connect shows ConsentModal first', async () => {
    renderPanel();
    const connectBtn = await screen.findByRole('button', { name: /connect instagram/i });
    fireEvent.click(connectBtn);
    expect(await screen.findByTestId('consent-modal')).toBeInTheDocument();
  });

  it('accepting consent calls redirectToLogin for the platform', async () => {
    renderPanel();
    const connectBtn = await screen.findByRole('button', { name: /connect instagram/i });
    fireEvent.click(connectBtn);
    await screen.findByTestId('consent-modal');
    fireEvent.click(screen.getByRole('button', { name: /accept/i }));
    await waitFor(() => {
      expect(base44.auth.redirectToLogin).toHaveBeenCalledWith({ provider: 'instagram' });
    });
  });

  it('declining consent does NOT call redirectToLogin', async () => {
    renderPanel();
    const connectBtn = await screen.findByRole('button', { name: /connect instagram/i });
    fireEvent.click(connectBtn);
    await screen.findByTestId('consent-modal');
    fireEvent.click(screen.getByRole('button', { name: /decline/i }));
    await waitFor(() => {}, { timeout: 200 });
    expect(base44.auth.redirectToLogin).not.toHaveBeenCalled();
  });
});

// ── Reconnect dialog ──────────────────────────────────────────────────────────

describe('SocialConnectPanel – reconnect (already connected)', () => {
  it('shows Reconnect button when platform is connected', async () => {
    renderPanel(['instagram']);
    expect(await screen.findByRole('button', { name: /reconnect/i })).toBeInTheDocument();
  });

  it('clicking Reconnect opens OAuth confirmation dialog (not token dialog)', async () => {
    renderPanel(['instagram']);
    const reconnectBtn = await screen.findByRole('button', { name: /reconnect/i });
    fireEvent.click(reconnectBtn);
    // Should show the OAuth dialog with security assurance
    expect(await screen.findByText(/continue to instagram/i)).toBeInTheDocument();
  });

  it('OAuth confirmation dialog shows security message', async () => {
    renderPanel(['instagram']);
    fireEvent.click(await screen.findByRole('button', { name: /reconnect/i }));
    expect(await screen.findByText(/password is never shared/i)).toBeInTheDocument();
  });

  it('reconnect confirmation shows Sync Now button', async () => {
    renderPanel(['instagram']);
    expect(await screen.findByRole('button', { name: /sync now/i })).toBeInTheDocument();
  });
});

// ── Sync ──────────────────────────────────────────────────────────────────────

describe('SocialConnectPanel – sync', () => {
  it('clicking Sync Now calls InvokeLLM', async () => {
    base44.integrations.Core.InvokeLLM.mockResolvedValue({ items: [] });
    renderPanel(['instagram']);
    const syncBtn = await screen.findByRole('button', { name: /sync now/i });
    fireEvent.click(syncBtn);
    await waitFor(() => {
      expect(base44.integrations.Core.InvokeLLM).toHaveBeenCalled();
    });
  });
});
