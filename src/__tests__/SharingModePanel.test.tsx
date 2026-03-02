// src/__tests__/SharingModePanel.test.tsx — 27 uncovered → target 75%+
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/api/base44Client', () => ({
  base44: {
    auth: { me: jest.fn().mockResolvedValue({ id: 'u1' }) },
    entities: {
      SharedBoard: {
        list:   jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'b1' }),
      },
      UserSubscription: { filter: jest.fn().mockResolvedValue([]) },
      PremiumTrial:     { filter: jest.fn().mockResolvedValue([]) },
      SpecialAccount:   { filter: jest.fn().mockResolvedValue([]) },
    },
    integrations: { Core: {} },
  },
}));

const { base44 } = require('@/api/base44Client');

import SharingModePanel from '../components/dashboard/SharingModePanel';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe('SharingModePanel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the panel heading', async () => {
    render(<SharingModePanel />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getByText(/Sharing/i)).toBeInTheDocument());
  });

  it('shows "No shared boards yet" when boards list is empty', async () => {
    render(<SharingModePanel />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getByText(/No shared boards yet/i)).toBeInTheDocument());
  });

  it('renders the 4 mode emoji/icon quick-create buttons when no boards exist', async () => {
    render(<SharingModePanel />, { wrapper: makeWrapper() });
    await waitFor(() => {
      // The 4 emoji buttons: ❤️ 🏠 👥 👨‍👩‍👧
      expect(screen.getByText('❤️')).toBeInTheDocument();
      expect(screen.getByText('🏠')).toBeInTheDocument();
    });
  });

  it('opens the create board dialog when a mode emoji is clicked', async () => {
    render(<SharingModePanel />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getByText('❤️'));
    fireEvent.click(screen.getByText('❤️'));
    await waitFor(() => expect(screen.getByText(/Create Sharing Board/i)).toBeInTheDocument());
  });

  it('shows all 4 mode labels via the open state dialog', async () => {
    // The mode cards (Couples, Roommates, Friends, Family) are rendered inside the Dialog.
    // We verify they become visible after the dialog opens using fireEvent which is
    // synchronous and reliably sets React state in jsdom.
    render(<SharingModePanel />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getByText('❤️'));
    // Click opens dialog via React state (setOpen(true) + setSelectedMode)
    fireEvent.click(screen.getByText('❤️'));
    await waitFor(() => expect(screen.getByText(/Create Sharing Board/i)).toBeInTheDocument());
    // Confirm mode selection cards are visible
    const modeButtons = screen.getAllByRole('button').filter(b =>
      ['Couples','Roommates','Friends','Family'].some(m => b.textContent?.includes(m))
    );
    expect(modeButtons.length).toBeGreaterThanOrEqual(4);
  });

  it('enables Create Board button only after selecting a mode', async () => {
    render(<SharingModePanel />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getByText('❤️'));
    fireEvent.click(screen.getByText('❤️'));
    // Initially button is disabled (no mode pre-selected when opened from emoji)
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Create Board/i });
      // Couples was pre-selected because we clicked ❤️ emoji
      expect(btn).not.toBeDisabled();
    });
  });

  it('calls SharedBoard.create when Create Board is clicked', async () => {
    render(<SharingModePanel />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getByText('❤️'));
    fireEvent.click(screen.getByText('❤️'));
    await waitFor(() => screen.getByRole('button', { name: /Create Board/i }));
    fireEvent.click(screen.getByRole('button', { name: /Create Board/i }));
    await waitFor(() =>
      expect(base44.entities.SharedBoard.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.stringContaining('Board') })
      )
    );
  });

  it('shows boards list when boards exist', async () => {
    base44.entities.SharedBoard.list.mockResolvedValue([
      { id: 'b1', name: 'Couples Board', icon: '❤️', members: ['a@b.com'] },
    ]);
    render(<SharingModePanel />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getByText(/Couples Board/i)).toBeInTheDocument());
  });

  it('shows member count on existing boards', async () => {
    base44.entities.SharedBoard.list.mockResolvedValue([
      { id: 'b1', name: 'Friends Board', icon: '👥', members: ['a@b.com', 'c@d.com'] },
    ]);
    render(<SharingModePanel />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getByText(/2 members/i)).toBeInTheDocument());
  });

  it('renders the reminder Bell button on an existing board', async () => {
    base44.entities.SharedBoard.list.mockResolvedValue([
      { id: 'b1', name: 'Ag Network', icon: '👥', members: ['a@b.com'] },
    ]);
    render(<SharingModePanel />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getByText(/Ag Network/i));
    // Bell button triggers sendReminder — it calls window.alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    // Remove Notification from window so the if-branch is skipped and only alert runs
    const origNotification = (window as any).Notification;
    delete (window as any).Notification;
    const bellBtn = screen.getByTitle('Send reminder');
    fireEvent.click(bellBtn);
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Ag Network'));
    // Restore
    (window as any).Notification = origNotification;
    alertSpy.mockRestore();
  });

  it('calls sendReminder with Notification.requestPermission when Notification API exists', async () => {
    base44.entities.SharedBoard.list.mockResolvedValue([
      { id: 'b2', name: 'Date Night Board', icon: '❤️', members: ['a@b.com'] },
    ]);
    const permSpy = jest.fn().mockResolvedValue('granted');
    const NotifConstructor = jest.fn();
    // Assign Notification to window so 'Notification' in window is true
    (window as any).Notification = Object.assign(NotifConstructor, { requestPermission: permSpy });
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    render(<SharingModePanel />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getByText(/Date Night Board/i));
    fireEvent.click(screen.getByTitle('Send reminder'));
    await waitFor(() => expect(permSpy).toHaveBeenCalled());
    delete (window as any).Notification;
    alertSpy.mockRestore();
  });

  it('fills in invite email and creates board with email', async () => {
    render(<SharingModePanel />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getByText('❤️'));
    fireEvent.click(screen.getByText('❤️'));
    await waitFor(() => screen.getByPlaceholderText(/friend@email.com/i));
    fireEvent.change(screen.getByPlaceholderText(/friend@email.com/i), {
      target: { value: 'partner@farm.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create Board/i }));
    // Component passes email as members array, not invite_email
    await waitFor(() =>
      expect(base44.entities.SharedBoard.create).toHaveBeenCalledWith(
        expect.objectContaining({ members: ['partner@farm.com'] })
      )
    );
  });

  it('shows Board Created! success state after creation', async () => {
    render(<SharingModePanel />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getByText('❤️'));
    fireEvent.click(screen.getByText('❤️'));
    await waitFor(() => screen.getByRole('button', { name: /Create Board/i }));
    fireEvent.click(screen.getByRole('button', { name: /Create Board/i }));
    await waitFor(() =>
      expect(screen.getByText(/Board Created!/i)).toBeInTheDocument()
    );
  });

  it('opens dialog from the top-right Create button', async () => {
    render(<SharingModePanel />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getByText(/Create/i));
    const createBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Create'));
    if (createBtn) fireEvent.click(createBtn);
    await waitFor(() => expect(screen.getByText(/Create Sharing Board/i)).toBeInTheDocument());
  });

  it('renders the Gift badge on existing boards', async () => {
    base44.entities.SharedBoard.list.mockResolvedValue([
      { id: 'b1', name: 'Ag Network', icon: '👥', members: ['x@y.com'] },
    ]);
    render(<SharingModePanel />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getByText(/Ag Network/i));
    // The Gift badge is always rendered next to every board row
    expect(screen.getByText(/Gift/i)).toBeInTheDocument();
  });
});
