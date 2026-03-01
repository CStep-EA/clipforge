// src/__tests__/TrialCountdown.test.tsx
// TrialCountdown is pure logic + presentation — critical pre-launch component.
// Tests: renders correctly, shows urgent state, handles expired trials.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TrialCountdown from '../components/subscription/TrialCountdown';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

function makeTrial(overrides = {}) {
  const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
  return {
    trial_end: future.toISOString(),
    trial_plan: 'premium',
    is_active: true,
    ...overrides,
  };
}

describe('TrialCountdown', () => {
  it('renders trial active message for premium plan', () => {
    render(<TrialCountdown trial={makeTrial()} />, { wrapper: Wrapper });
    expect(screen.getByText(/Premium Trial Active/i)).toBeInTheDocument();
  });

  it('renders Family Premium label for family plan', () => {
    render(<TrialCountdown trial={makeTrial({ trial_plan: 'family' })} />, { wrapper: Wrapper });
    expect(screen.getByText(/Family Premium Trial Active/i)).toBeInTheDocument();
  });

  it('shows subscribe CTA button', () => {
    render(<TrialCountdown trial={makeTrial()} />, { wrapper: Wrapper });
    expect(screen.getByText(/Subscribe & Keep Access/i)).toBeInTheDocument();
  });

  it('shows "Expiring Soon" badge when 2 or fewer days remain', () => {
    const urgent = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // 1 day
    render(
      <TrialCountdown trial={makeTrial({ trial_end: urgent.toISOString() })} />,
      { wrapper: Wrapper }
    );
    expect(screen.getByText(/Expiring Soon/i)).toBeInTheDocument();
  });

  it('does NOT show "Expiring Soon" when 5 days remain', () => {
    render(<TrialCountdown trial={makeTrial()} />, { wrapper: Wrapper });
    expect(screen.queryByText(/Expiring Soon/i)).toBeNull();
  });

  it('renders nothing when trial is already expired', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const { container } = render(
      <TrialCountdown trial={makeTrial({ trial_end: past })} />,
      { wrapper: Wrapper }
    );
    expect(container.firstChild).toBeNull();
  });

  it('displays time segments (d / h / m)', () => {
    const { container } = render(<TrialCountdown trial={makeTrial()} />, { wrapper: Wrapper });
    expect(container.textContent).toMatch(/d/);
    expect(container.textContent).toMatch(/h/);
    expect(container.textContent).toMatch(/m/);
  });
});
