import { render } from '@testing-library/react';
import ClipForgeLogo from '../components/shared/ClipForgeLogo'; // adjust path if needed (relative from __tests__)

describe('ClipForgeLogo', () => {
  it('renders without crashing', () => {
    const { container } = render(<ClipForgeLogo />);
    expect(container).toBeInTheDocument(); // simple crash check
  });

  it('has expected wrapper styling', () => {
    const { container } = render(<ClipForgeLogo />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex');
    expect(wrapper).toHaveClass('items-center');
    expect(wrapper).toHaveClass('gap-2');
    expect(wrapper).toHaveClass('select-none');
  });

  it('contains an SVG element', () => {
    const { container } = render(<ClipForgeLogo />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 96 96');
  });
});