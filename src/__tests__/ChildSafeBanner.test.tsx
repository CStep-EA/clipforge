// src/__tests__/ChildSafeBanner.test.tsx
// Pure presentational component — no props, no API deps.
import React from 'react';
import { render, screen } from '@testing-library/react';
import ChildSafeBanner from '../components/family/ChildSafeBanner';

describe('ChildSafeBanner', () => {
  it('renders without crashing', () => {
    const { container } = render(<ChildSafeBanner />);
    expect(container).toBeInTheDocument();
  });

  it('displays Kid-Safe Mode label', () => {
    render(<ChildSafeBanner />);
    expect(screen.getByText(/Kid-Safe Mode Active/i)).toBeInTheDocument();
  });

  it('shows safety feature description', () => {
    render(<ChildSafeBanner />);
    expect(screen.getByText(/Content filters on/i)).toBeInTheDocument();
  });
});
