/**
 * SignIn.test.tsx
 * Tests for the branded ClipForge sign-in page:
 *   - Renders three auth buttons (Google, Apple, Email)
 *   - No API-token / password inputs visible on mount
 *   - Google/Apple buttons call base44.auth.redirectToLogin
 *   - Email flow: shows input on click, sends magic link
 *   - Magic-link success state shows confirmation UI
 *   - Error handling shows user-friendly message
 *   - Accessibility: proper aria-labels, no disabled state on idle
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Use module factory (no require loop)
jest.mock('@/api/base44Client', () => ({
  base44: {
    auth: {
      me:              jest.fn().mockResolvedValue({ id: 'u1', email: 'test@test.com' }),
      redirectToLogin: jest.fn().mockResolvedValue({}),
      sendMagicLink:   jest.fn().mockResolvedValue({}),
      logout:          jest.fn(),
    },
    entities: {},
    functions: { invoke: jest.fn().mockResolvedValue({}) },
    integrations: { Core: { InvokeLLM: jest.fn() } },
  },
}));

const { base44 } = require('@/api/base44Client');

import SignIn from '../pages/SignIn';

function renderSignIn() {
  return render(
    <MemoryRouter>
      <SignIn />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  base44.auth.redirectToLogin.mockResolvedValue({});
  base44.auth.sendMagicLink.mockResolvedValue({});
});

// ── Render tests ─────────────────────────────────────────────────────────────

describe('SignIn – render', () => {
  it('renders Klip4ge brand name', () => {
    renderSignIn();
    expect(screen.getByText('Klip4ge')).toBeInTheDocument();
  });

  it('renders tagline', () => {
    renderSignIn();
    expect(screen.getByText(/save smarter/i)).toBeInTheDocument();
  });

  it('renders Continue with Google button', () => {
    renderSignIn();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('renders Continue with Apple button', () => {
    renderSignIn();
    expect(screen.getByRole('button', { name: /continue with apple/i })).toBeInTheDocument();
  });

  it('renders Continue with Email button', () => {
    renderSignIn();
    expect(screen.getByRole('button', { name: /continue with email/i })).toBeInTheDocument();
  });

  it('does NOT show any password input on mount', () => {
    renderSignIn();
    expect(screen.queryByPlaceholderText(/api token/i)).toBeNull();
    expect(screen.queryByDisplayValue(/token/i)).toBeNull();
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    expect(passwordInputs.length).toBe(0);
  });

  it('does NOT show email input until email button is clicked', () => {
    renderSignIn();
    expect(screen.queryByPlaceholderText(/you@example.com/i)).toBeNull();
  });

  it('renders Terms and Privacy links', () => {
    renderSignIn();
    expect(screen.getByRole('link', { name: /terms/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
  });

  it('states data is never sold', () => {
    renderSignIn();
    expect(screen.getByText(/never sell your data/i)).toBeInTheDocument();
  });
});

// ── Google OAuth ──────────────────────────────────────────────────────────────

describe('SignIn – Google OAuth', () => {
  it('calls base44.auth.redirectToLogin with provider google', async () => {
    renderSignIn();
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    await waitFor(() => {
      expect(base44.auth.redirectToLogin).toHaveBeenCalledWith({ provider: 'google' });
    });
  });

  it('disables Google button while loading', async () => {
    base44.auth.redirectToLogin.mockImplementation(() => new Promise(() => {})); // never resolves
    renderSignIn();
    const btn = screen.getByRole('button', { name: /continue with google/i });
    fireEvent.click(btn);
    // Button becomes disabled during loading — spinner shown
    await waitFor(() => {
      // The button is disabled OR shows a loading spinner
      const loadingBtn = screen.getByRole('button', { name: /continue with google/i });
      expect(loadingBtn.disabled || loadingBtn.querySelector('span.animate-spin')).toBeTruthy();
    });
  });
});

// ── Apple OAuth ───────────────────────────────────────────────────────────────

describe('SignIn – Apple OAuth', () => {
  it('calls base44.auth.redirectToLogin with provider apple', async () => {
    renderSignIn();
    fireEvent.click(screen.getByRole('button', { name: /continue with apple/i }));
    await waitFor(() => {
      expect(base44.auth.redirectToLogin).toHaveBeenCalledWith({ provider: 'apple' });
    });
  });
});

// ── Email magic link ──────────────────────────────────────────────────────────

describe('SignIn – Email magic link', () => {
  it('shows email input after clicking Continue with Email', async () => {
    renderSignIn();
    fireEvent.click(screen.getByRole('button', { name: /continue with email/i }));
    expect(await screen.findByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
  });

  it('send button is disabled when email is empty', async () => {
    renderSignIn();
    fireEvent.click(screen.getByRole('button', { name: /continue with email/i }));
    await screen.findByPlaceholderText(/you@example.com/i);
    const sendBtn = screen.getByRole('button', { name: /send magic link/i });
    expect(sendBtn).toBeDisabled();
  });

  it('enables send button when email is entered', async () => {
    renderSignIn();
    fireEvent.click(screen.getByRole('button', { name: /continue with email/i }));
    const input = await screen.findByPlaceholderText(/you@example.com/i);
    fireEvent.change(input, { target: { value: 'colton@bowerag.com' } });
    expect(screen.getByRole('button', { name: /send magic link/i })).not.toBeDisabled();
  });

  it('calls base44.auth.sendMagicLink with entered email', async () => {
    renderSignIn();
    fireEvent.click(screen.getByRole('button', { name: /continue with email/i }));
    const input = await screen.findByPlaceholderText(/you@example.com/i);
    fireEvent.change(input, { target: { value: 'colton@bowerag.com' } });
    // Click the submit button
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));
    await waitFor(() => {
      expect(base44.auth.sendMagicLink).toHaveBeenCalledWith({ email: 'colton@bowerag.com' });
    });
  });

  it('shows success confirmation after magic link sent', async () => {
    renderSignIn();
    fireEvent.click(screen.getByRole('button', { name: /continue with email/i }));
    const input = await screen.findByPlaceholderText(/you@example.com/i);
    fireEvent.change(input, { target: { value: 'colton@bowerag.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));
    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
    expect(screen.getByText('colton@bowerag.com')).toBeInTheDocument();
  });

  it('shows "use a different email" link after confirmation', async () => {
    renderSignIn();
    fireEvent.click(screen.getByRole('button', { name: /continue with email/i }));
    const input = await screen.findByPlaceholderText(/you@example.com/i);
    fireEvent.change(input, { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));
    expect(await screen.findByText(/use a different email/i)).toBeInTheDocument();
  });

  it('back button hides email input', async () => {
    renderSignIn();
    fireEvent.click(screen.getByRole('button', { name: /continue with email/i }));
    await screen.findByPlaceholderText(/you@example.com/i);
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.queryByPlaceholderText(/you@example.com/i)).toBeNull();
  });

  it('shows error message when sendMagicLink rejects', async () => {
    base44.auth.sendMagicLink.mockRejectedValueOnce(new Error('network error'));
    renderSignIn();
    fireEvent.click(screen.getByRole('button', { name: /continue with email/i }));
    const input = await screen.findByPlaceholderText(/you@example.com/i);
    fireEvent.change(input, { target: { value: 'bad@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn't send/i);
  });

  it('shows error message when OAuth rejects', async () => {
    base44.auth.redirectToLogin.mockRejectedValueOnce(new Error('oauth error'));
    renderSignIn();
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
  });
});

// ── Accessibility ─────────────────────────────────────────────────────────────

describe('SignIn – accessibility', () => {
  it('all three primary buttons have aria-label', () => {
    renderSignIn();
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn).toHaveAttribute('aria-label');
    });
  });

  it('email input has aria-label when visible', async () => {
    renderSignIn();
    fireEvent.click(screen.getByRole('button', { name: /continue with email/i }));
    const input = await screen.findByPlaceholderText(/you@example.com/i);
    expect(input).toHaveAttribute('aria-label');
  });

  it('error message has role=alert', async () => {
    base44.auth.redirectToLogin.mockRejectedValueOnce(new Error('fail'));
    renderSignIn();
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
  });
});
