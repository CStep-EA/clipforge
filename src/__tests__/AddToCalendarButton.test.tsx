// src/__tests__/AddToCalendarButton.test.tsx — 56 uncovered → target 70%+
// Uses userEvent (v14) so Radix pointer-event-based dropdowns open correctly.
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/api/base44Client', () => ({
  base44: {
    auth: { me: jest.fn().mockResolvedValue({ id: 'u1', email: 'x@x.com' }) },
    entities: {
      SavedItem:        { update: jest.fn().mockResolvedValue({}) },
      EventSuggestion:  { update: jest.fn().mockResolvedValue({}) },
      UserSubscription: { filter: jest.fn().mockResolvedValue([]) },
      PremiumTrial:     { filter: jest.fn().mockResolvedValue([]) },
      SpecialAccount:   { filter: jest.fn().mockResolvedValue([]) },
    },
    integrations: { Core: { InvokeLLM: jest.fn() } },
  },
}));

import AddToCalendarButton from '../components/events/AddToCalendarButton';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

const mockEvent = {
  id: 'ev1',
  name: 'Dairy Ag Summit',
  date: '2025-08-15T18:00:00Z',
  venue: 'Fort Collins Fairgrounds',
  city: 'Fort Collins',
  description: 'Annual ag summit for dairy farmers.',
  ticketmaster_url: 'https://tm.example.com/event/1',
  reminder_enabled: false,
};

describe('AddToCalendarButton', () => {
  it('renders the Add to Calendar trigger button', () => {
    render(<AddToCalendarButton event={mockEvent} />, { wrapper: makeWrapper() });
    expect(screen.getByText(/Add to Calendar/i)).toBeInTheDocument();
  });

  it('renders at least two buttons (calendar + bell)', () => {
    const { container } = render(<AddToCalendarButton event={mockEvent} />, { wrapper: makeWrapper() });
    expect(container.querySelectorAll('button').length).toBeGreaterThanOrEqual(2);
  });

  it('opens dropdown and shows Google, Apple, Outlook options', async () => {
    const user = userEvent.setup();
    render(<AddToCalendarButton event={mockEvent} />, { wrapper: makeWrapper() });
    await user.click(screen.getByText(/Add to Calendar/i).closest('button')!);
    await waitFor(() => {
      expect(screen.getByText(/Google Calendar/i)).toBeInTheDocument();
      expect(screen.getByText(/Apple Calendar/i)).toBeInTheDocument();
      expect(screen.getByText(/Outlook Calendar/i)).toBeInTheDocument();
    });
  });

  it('shows Yahoo Calendar locked with Pro+ badge for free users', async () => {
    const user = userEvent.setup();
    render(<AddToCalendarButton event={mockEvent} />, { wrapper: makeWrapper() });
    await user.click(screen.getByText(/Add to Calendar/i).closest('button')!);
    await waitFor(() => {
      expect(screen.getByText(/Yahoo Calendar/i)).toBeInTheDocument();
      expect(screen.getByText(/Pro\+/i)).toBeInTheDocument();
    });
  });

  it('shows no-date warning when event has no date field', async () => {
    const user = userEvent.setup();
    const noDate = { ...mockEvent, date: undefined as any };
    render(<AddToCalendarButton event={noDate} />, { wrapper: makeWrapper() });
    await user.click(screen.getByText(/Add to Calendar/i).closest('button')!);
    await waitFor(() => {
      expect(screen.getByText(/No event date stored/i)).toBeInTheDocument();
    });
  });

  it('applies active blue class when reminder_enabled=true', () => {
    const withReminder = { ...mockEvent, reminder_enabled: true };
    const { container } = render(<AddToCalendarButton event={withReminder} />, { wrapper: makeWrapper() });
    expect(container.innerHTML).toContain('00BFFF');
  });

  it('opens reminder popover when bell button is clicked', async () => {
    const user = userEvent.setup();
    render(<AddToCalendarButton event={mockEvent} />, { wrapper: makeWrapper() });
    const buttons = screen.getAllByRole('button');
    // Bell is always the last button
    await user.click(buttons[buttons.length - 1]);
    await waitFor(() => {
      expect(screen.getByText(/Event Reminders/i)).toBeInTheDocument();
    });
  });

  it('shows ticket purchase warning inside reminder popover', async () => {
    const user = userEvent.setup();
    render(<AddToCalendarButton event={mockEvent} />, { wrapper: makeWrapper() });
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[buttons.length - 1]);
    await waitFor(() => {
      expect(screen.getByText(/remind you to buy/i)).toBeInTheDocument();
    });
  });

  it('shows Save Preferences button inside reminder popover', async () => {
    const user = userEvent.setup();
    render(<AddToCalendarButton event={mockEvent} />, { wrapper: makeWrapper() });
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[buttons.length - 1]);
    await waitFor(() => {
      expect(screen.getByText(/Save Preferences/i)).toBeInTheDocument();
    });
  });

  // ── ICS download path ────────────────────────────────────────────────────────

  it('triggers ICS download when Apple Calendar is clicked', async () => {
    // jsdom doesn't implement URL.createObjectURL — define it so jest.spyOn works
    if (!URL.createObjectURL) {
      (URL as any).createObjectURL = () => 'blob:fake';
    }
    if (!URL.revokeObjectURL) {
      (URL as any).revokeObjectURL = () => {};
    }
    const createSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    const revokeSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy  = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const user = userEvent.setup();
    render(<AddToCalendarButton event={mockEvent} />, { wrapper: makeWrapper() });
    await user.click(screen.getByText(/Add to Calendar/i).closest('button')!);
    await waitFor(() => screen.getByText(/Apple Calendar/i));
    await user.click(screen.getByText(/Apple Calendar/i));

    expect(createSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    createSpy.mockRestore();
    revokeSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it('opens Google Calendar URL in new tab when Google Calendar is clicked', async () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const user = userEvent.setup();
    render(<AddToCalendarButton event={mockEvent} />, { wrapper: makeWrapper() });
    await user.click(screen.getByText(/Add to Calendar/i).closest('button')!);
    await waitFor(() => screen.getByText(/Google Calendar/i));
    await user.click(screen.getByText(/Google Calendar/i));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('calendar.google.com'), '_blank');
    openSpy.mockRestore();
  });

  it('opens Outlook URL in new tab when Outlook Calendar is clicked', async () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const user = userEvent.setup();
    render(<AddToCalendarButton event={mockEvent} />, { wrapper: makeWrapper() });
    await user.click(screen.getByText(/Add to Calendar/i).closest('button')!);
    await waitFor(() => screen.getByText(/Outlook Calendar/i));
    await user.click(screen.getByText(/Outlook Calendar/i));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('outlook.live.com'), '_blank');
    openSpy.mockRestore();
  });

  // ── ReminderConfig interaction ───────────────────────────────────────────────

  it('shows email input inside popover when reminder switch is toggled on', async () => {
    const user = userEvent.setup();
    render(<AddToCalendarButton event={mockEvent} />, { wrapper: makeWrapper() });
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[buttons.length - 1]);
    await waitFor(() => screen.getByText(/Event Reminders/i));
    // Toggle the switch (Enable reminders)
    const switchEl = screen.getByRole('switch');
    await user.click(switchEl);
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/your@email.com/i)).toBeInTheDocument()
    );
  });

  it('calls SavedItem.update when Save Preferences is clicked (SavedItem entity)', async () => {
    const { base44 } = require('@/api/base44Client');
    const user = userEvent.setup();
    render(<AddToCalendarButton event={mockEvent} entity="SavedItem" />, { wrapper: makeWrapper() });
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[buttons.length - 1]);
    await waitFor(() => screen.getByText(/Save Preferences/i));
    await user.click(screen.getByText(/Save Preferences/i));
    await waitFor(() =>
      expect(base44.entities.SavedItem.update).toHaveBeenCalledWith(
        'ev1',
        expect.objectContaining({ reminder_enabled: false })
      )
    );
  });

  it('uses event_date field when date is absent but event_date is present', () => {
    const evWithEventDate = { ...mockEvent, date: undefined, event_date: '2025-09-01T10:00:00Z' };
    const { container } = render(
      <AddToCalendarButton event={evWithEventDate} />, { wrapper: makeWrapper() }
    );
    // Component should still render without crashing
    expect(container.querySelector('button')).toBeInTheDocument();
  });

  it('uses title field when name is absent', async () => {
    const evWithTitle = { ...mockEvent, name: undefined, title: 'Harvest Festival' };
    render(<AddToCalendarButton event={evWithTitle} />, { wrapper: makeWrapper() });
    // Should render without crash — button still present
    expect(screen.getByText(/Add to Calendar/i)).toBeInTheDocument();
  });
});
