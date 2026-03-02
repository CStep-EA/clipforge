// setupTests.ts — global test setup, runs after jest-environment-jsdom is ready
import '@testing-library/jest-dom';

// ─── jsdom polyfills ───────────────────────────────────────────────────────────
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (typeof (global as any).IntersectionObserver === 'undefined') {
  (global as any).IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (typeof window.matchMedia === 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// ─── Warning suppression ───────────────────────────────────────────────────────
// These are known-safe warnings from third-party libraries (Radix, recharts,
// React Router) that produce noise but don't affect test validity.
const _WARN_FILTERS = [
  'Missing `Description` or `aria-describedby={undefined}` for {DialogContent}',
  'React does not recognize the `dataKey` prop',
  'React does not recognize the `tickLine` prop',
  'React does not recognize the `axisLine` prop',
  'React does not recognize the `stackId` prop',
  'React does not recognize the `outerRadius` prop',
  'React does not recognize the `innerRadius` prop',
  'React does not recognize the `allowDecimals` prop',
  'React does not recognize the `tickFormatter` prop',
  'React does not recognize the `strokeWidth` prop',
  'Received `false` for a non-boolean attribute `dot`',
  'is using incorrect casing. Use PascalCase for React components',
  'The tag <linearGradient> is unrecognized in this browser',
  'The tag <stop> is unrecognized in this browser',
  'The tag <defs> is unrecognized in this browser',
  'React Router Future Flag Warning',
];

const _origWarn  = console.warn.bind(console);
const _origError = console.error.bind(console);

beforeAll(() => {
  const suppress = (orig: (...a: any[]) => void) => (...args: any[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (_WARN_FILTERS.some(f => msg.includes(f))) return;
    orig(...args);
  };
  console.warn  = suppress(_origWarn);
  console.error = suppress(_origError);
});

afterAll(() => {
  console.warn  = _origWarn;
  console.error = _origError;
});

// ─── Per-test cleanup ─────────────────────────────────────────────────────────
afterEach(() => {
  localStorage.clear();
  jest.useRealTimers();
});
