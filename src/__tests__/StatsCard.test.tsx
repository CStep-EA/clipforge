// src/__tests__/StatsCard.test.tsx
// StatsCard is pure presentational — no API deps, 100% testable
import React from 'react';
import { render, screen } from '@testing-library/react';
import StatsCard from '../components/shared/StatsCard';
import { Bookmark } from 'lucide-react';

describe('StatsCard', () => {
  it('renders title and value', () => {
    render(<StatsCard title="Total Saves" value={42} icon={Bookmark} />);
    expect(screen.getByText('Total Saves')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows upward trend indicator', () => {
    render(<StatsCard title="Saves" value={10} icon={Bookmark} trend={12} />);
    expect(screen.getByText(/12%/)).toBeInTheDocument();
    expect(screen.getByText(/↑/)).toBeInTheDocument();
  });

  it('shows downward trend indicator', () => {
    render(<StatsCard title="Saves" value={5} icon={Bookmark} trend={-8} />);
    expect(screen.getByText(/8%/)).toBeInTheDocument();
    expect(screen.getByText(/↓/)).toBeInTheDocument();
  });

  it('renders no trend when trend prop is omitted', () => {
    const { container } = render(<StatsCard title="Saves" value={5} icon={Bookmark} />);
    expect(container.querySelector('.text-emerald-400')).toBeNull();
    expect(container.querySelector('.text-red-400')).toBeNull();
  });

  it('applies custom accent color via inline style', () => {
    const { container } = render(
      <StatsCard title="Saves" value={1} icon={Bookmark} accent="#FF00FF" />
    );
    const valueEl = container.querySelector('p.text-2xl');
    expect(valueEl).toHaveStyle({ color: '#FF00FF' });
  });

  it('applies additional className to root div', () => {
    const { container } = render(
      <StatsCard title="Saves" value={1} icon={Bookmark} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
