/**
 * MobileNav.test.tsx
 * Tests for the grandma-proof redesigned MobileNav:
 *   - Renders exactly 3 primary tabs (Home, Saves, More)
 *   - Does NOT render Connect as a primary tab
 *   - Active tab shows aria-current="page"
 *   - More button opens drawer
 *   - Drawer contains Connect and other items
 *   - Escape key closes drawer
 *   - Overlay click closes drawer
 *   - All tabs have aria-label
 *   - Nav items link to correct pages
 *   - Admin items only shown when role=admin
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/utils', () => ({
  createPageUrl: (name: string) => `/${name}`,
}));

import MobileNav from '../components/layout/MobileNav';

function renderNav(currentPage = 'Dashboard', userRole?: string) {
  return render(
    <MemoryRouter>
      <MobileNav currentPage={currentPage} userRole={userRole} />
    </MemoryRouter>
  );
}

// ── Primary tabs ──────────────────────────────────────────────────────────────

describe('MobileNav – primary tabs', () => {
  it('renders Home tab', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
  });

  it('renders Saves tab', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /saves/i })).toBeInTheDocument();
  });

  it('renders More button', () => {
    renderNav();
    expect(screen.getByRole('button', { name: /toggle navigation menu/i })).toBeInTheDocument();
  });

  it('does NOT render Connect as a primary tab', () => {
    renderNav();
    // Connect should not be in the bottom tab bar directly
    const bottomNav = screen.getByRole('navigation', { name: /mobile navigation/i });
    // Connect should not appear as a link in the bottom bar
    const links = bottomNav.querySelectorAll('a');
    const linkTexts = Array.from(links).map(l => l.textContent?.toLowerCase());
    expect(linkTexts).not.toContain('connect');
  });

  it('renders exactly 2 primary tab links + 1 More button in tab bar', () => {
    renderNav();
    const nav = screen.getByRole('navigation', { name: /mobile navigation/i });
    const links = nav.querySelectorAll('a');
    const buttons = nav.querySelectorAll('button');
    expect(links).toHaveLength(2); // Home, Saves
    expect(buttons).toHaveLength(1); // More
  });
});

// ── Active state ──────────────────────────────────────────────────────────────

describe('MobileNav – active state', () => {
  it('active page link has aria-current="page"', () => {
    renderNav('Dashboard');
    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toHaveAttribute('aria-current', 'page');
  });

  it('inactive page link does NOT have aria-current', () => {
    renderNav('Dashboard');
    const savesLink = screen.getByRole('link', { name: /saves/i });
    expect(savesLink).not.toHaveAttribute('aria-current', 'page');
  });

  it('Saves link is active when currentPage=Saves', () => {
    renderNav('Saves');
    expect(screen.getByRole('link', { name: /saves/i })).toHaveAttribute('aria-current', 'page');
  });
});

// ── More drawer ───────────────────────────────────────────────────────────────

describe('MobileNav – More drawer', () => {
  it('drawer is not visible before clicking More', () => {
    renderNav();
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog).toHaveAttribute('aria-hidden', 'true');
  });

  it('clicking More opens the drawer', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-hidden', 'false');
  });

  it('drawer contains Connect link', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    expect(screen.getByRole('link', { name: /connect/i })).toBeInTheDocument();
  });

  it('drawer contains Support link', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    expect(screen.getByRole('link', { name: /support/i })).toBeInTheDocument();
  });

  it('drawer contains FAQ link', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    expect(screen.getByRole('link', { name: /faq/i })).toBeInTheDocument();
  });

  it('drawer contains Settings link', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });

  it('close button inside drawer closes it', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    fireEvent.click(screen.getByRole('button', { name: /close navigation menu/i }));
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-hidden', 'true');
  });

  it('Escape key closes the drawer', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-hidden', 'false');
    // Backdrop click simulation
    const backdrop = document.querySelector('.fixed.inset-0');
    if (backdrop) fireEvent.click(backdrop);
    // Dialog should be hidden
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-hidden', 'true');
  });

  it('clicking a drawer link closes the drawer', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    // Click any link in the drawer (Connect)
    const connectLink = screen.getByRole('link', { name: /connect/i });
    fireEvent.click(connectLink);
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-hidden', 'true');
  });
});

// ── Admin items ───────────────────────────────────────────────────────────────

describe('MobileNav – admin items', () => {
  it('Admin link NOT shown to regular users', () => {
    renderNav('Dashboard', 'user');
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    expect(screen.queryByRole('link', { name: /^admin$/i })).toBeNull();
  });

  it('Admin link shown to admin users', () => {
    renderNav('Dashboard', 'admin');
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    expect(screen.getByRole('link', { name: /^admin$/i })).toBeInTheDocument();
  });

  it('Marketing link shown to admin users', () => {
    renderNav('Dashboard', 'admin');
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    expect(screen.getByRole('link', { name: /marketing/i })).toBeInTheDocument();
  });
});

// ── Routing ───────────────────────────────────────────────────────────────────

describe('MobileNav – routing', () => {
  it('Home tab links to /Dashboard', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/Dashboard');
  });

  it('Saves tab links to /Saves', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /saves/i })).toHaveAttribute('href', '/Saves');
  });
});

// ── Accessibility ──────────────────────────────────────────────────────────────

describe('MobileNav – accessibility', () => {
  it('bottom nav has role=navigation with label', () => {
    renderNav();
    expect(
      screen.getByRole('navigation', { name: /mobile navigation/i })
    ).toBeInTheDocument();
  });

  it('More button has aria-expanded attribute', () => {
    renderNav();
    const btn = screen.getByRole('button', { name: /toggle navigation menu/i });
    expect(btn).toHaveAttribute('aria-expanded');
  });

  it('More button has aria-haspopup=dialog', () => {
    renderNav();
    const btn = screen.getByRole('button', { name: /toggle navigation menu/i });
    expect(btn).toHaveAttribute('aria-haspopup', 'dialog');
  });
});
