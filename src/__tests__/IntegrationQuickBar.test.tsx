// src/__tests__/IntegrationQuickBar.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/utils', () => ({
  createPageUrl: (page: string) => `/${page.toLowerCase()}`,
}));

import IntegrationQuickBar from '../components/dashboard/IntegrationQuickBar';

const wrap = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('IntegrationQuickBar', () => {
  it('shows "Connect streaming platforms" when no connections', () => {
    wrap(<IntegrationQuickBar connections={[]} />);
    expect(screen.getByText(/Connect streaming platforms/i)).toBeInTheDocument();
  });

  it('shows connected count when some platforms are connected', () => {
    const connections = [
      { platform: 'discord', connected: true },
      { platform: 'twitch', connected: true },
    ];
    wrap(<IntegrationQuickBar connections={connections} />);
    expect(screen.getByText(/2 platforms connected/i)).toBeInTheDocument();
  });

  it('shows singular "platform connected" for one connection', () => {
    const connections = [{ platform: 'spotify', connected: true }];
    wrap(<IntegrationQuickBar connections={connections} />);
    expect(screen.getByText(/1 platform connected/i)).toBeInTheDocument();
  });

  it('renders nothing when all platforms are connected', () => {
    const connections = [
      { platform: 'discord', connected: true },
      { platform: 'twitch', connected: true },
      { platform: 'youtube', connected: true },
      { platform: 'spotify', connected: true },
    ];
    const { container } = wrap(<IntegrationQuickBar connections={connections} />);
    expect(container.textContent).toBe('');
  });

  it('shows "+ more to connect" text when not all connected', () => {
    wrap(<IntegrationQuickBar connections={[]} />);
    expect(screen.getByText(/\+4 more to connect/i)).toBeInTheDocument();
  });

  it('renders a link to Integrations page', () => {
    wrap(<IntegrationQuickBar connections={[]} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/integrations');
  });
});
