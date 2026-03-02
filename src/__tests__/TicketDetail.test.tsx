// src/__tests__/TicketDetail.test.tsx — 29 uncovered → target 80%+
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/api/base44Client', () => ({
  base44: {
    auth: { me: jest.fn().mockResolvedValue({ id: 'u1' }) },
    entities: {
      SupportTicket: {
        update: jest.fn().mockResolvedValue({}),
        filter: jest.fn().mockResolvedValue([]),
      },
      UserSubscription: { filter: jest.fn().mockResolvedValue([]) },
      PremiumTrial:     { filter: jest.fn().mockResolvedValue([]) },
      SpecialAccount:   { filter: jest.fn().mockResolvedValue([]) },
    },
    integrations: { Core: {} },
  },
}));

const { base44 } = require('@/api/base44Client');

import TicketDetail from '../components/support/TicketDetail';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

const baseTicket = {
  id: 'tk1',
  subject: 'App crashes on save',
  message: 'Every time I click save, the app crashes.',
  category: 'bug',
  status: 'open',
  priority: 'high',
  response: null,
  created_date: '2025-01-10T10:00:00Z',
};

describe('TicketDetail', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when ticket is null', () => {
    const { container } = render(
      <TicketDetail ticket={null} open={true} onOpenChange={jest.fn()} />,
      { wrapper: makeWrapper() }
    );
    expect(container.textContent).toBe('');
  });

  it('renders nothing when open=false', () => {
    const { container } = render(
      <TicketDetail ticket={baseTicket} open={false} onOpenChange={jest.fn()} />,
      { wrapper: makeWrapper() }
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('shows the ticket subject as dialog title', async () => {
    render(
      <TicketDetail ticket={baseTicket} open={true} onOpenChange={jest.fn()} />,
      { wrapper: makeWrapper() }
    );
    await waitFor(() => expect(screen.getByText(/App crashes on save/i)).toBeInTheDocument());
  });

  it('shows the ticket original message', async () => {
    render(
      <TicketDetail ticket={baseTicket} open={true} onOpenChange={jest.fn()} />,
      { wrapper: makeWrapper() }
    );
    await waitFor(() => expect(screen.getByText(/Every time I click save/i)).toBeInTheDocument());
  });

  it('shows the ticket status badge', async () => {
    render(
      <TicketDetail ticket={baseTicket} open={true} onOpenChange={jest.fn()} />,
      { wrapper: makeWrapper() }
    );
    await waitFor(() => expect(screen.getByText(/open/i)).toBeInTheDocument());
  });

  it('renders the reply textarea', async () => {
    render(
      <TicketDetail ticket={baseTicket} open={true} onOpenChange={jest.fn()} />,
      { wrapper: makeWrapper() }
    );
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Add a follow-up/i)).toBeInTheDocument()
    );
  });

  it('calls SupportTicket.update when reply is submitted', async () => {
    render(
      <TicketDetail ticket={baseTicket} open={true} onOpenChange={jest.fn()} />,
      { wrapper: makeWrapper() }
    );
    const textarea = await screen.findByPlaceholderText(/Add a follow-up/i);
    fireEvent.change(textarea, { target: { value: 'Still happening' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() =>
      expect(base44.entities.SupportTicket.update).toHaveBeenCalledWith(
        'tk1',
        expect.objectContaining({ response: expect.any(String) })
      )
    );
  });

  it('parses and renders legacy string response as a comment', async () => {
    const ticket = { ...baseTicket, response: 'Thanks for reaching out, we are looking into this.' };
    render(
      <TicketDetail ticket={ticket} open={true} onOpenChange={jest.fn()} />,
      { wrapper: makeWrapper() }
    );
    await waitFor(() => expect(screen.getByText(/Thanks for reaching out/i)).toBeInTheDocument());
  });

  it('parses and renders JSON comment thread', async () => {
    const comments = JSON.stringify([
      { role: 'support', text: 'We are investigating.', ts: '2025-01-10T11:00:00Z' },
      { role: 'user', text: 'Any update?', ts: '2025-01-10T12:00:00Z' },
    ]);
    const ticket = { ...baseTicket, response: comments };
    render(
      <TicketDetail ticket={ticket} open={true} onOpenChange={jest.fn()} />,
      { wrapper: makeWrapper() }
    );
    await waitFor(() => {
      expect(screen.getByText(/We are investigating/i)).toBeInTheDocument();
      expect(screen.getByText(/Any update/i)).toBeInTheDocument();
    });
  });

  it('shows admin status dropdown when isAdmin=true', async () => {
    render(
      <TicketDetail ticket={baseTicket} open={true} onOpenChange={jest.fn()} isAdmin={true} />,
      { wrapper: makeWrapper() }
    );
    await waitFor(() => {
      // Admin view shows a status change selector
      expect(screen.getByText(/Status/i)).toBeInTheDocument();
    });
  });

  // ── handleStatusChange (lines 71-73) ─────────────────────────────────────

  it('calls SupportTicket.update when Close Ticket is clicked', async () => {
    const openTicket = {
      ...baseTicket,
      status: 'open',
      replies: [],
    };
    render(
      <TicketDetail ticket={openTicket} open={true} onOpenChange={jest.fn()} />,
      { wrapper: makeWrapper() }
    );
    // "Close Ticket" button renders when status !== "closed" (line 166)
    await waitFor(() =>
      expect(screen.getByText(/Close Ticket/i)).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText(/Close Ticket/i));
    await waitFor(() =>
      expect(base44.entities.SupportTicket.update).toHaveBeenCalledWith(
        openTicket.id,
        { status: 'closed' }
      )
    );
  });

  it('does NOT render Close Ticket when ticket is already closed', async () => {
    const closedTicket = { ...baseTicket, status: 'closed', replies: [] };
    render(
      <TicketDetail ticket={closedTicket} open={true} onOpenChange={jest.fn()} />,
      { wrapper: makeWrapper() }
    );
    await waitFor(() => screen.getByText(closedTicket.subject));
    expect(screen.queryByText(/Close Ticket/i)).not.toBeInTheDocument();
  });
});
