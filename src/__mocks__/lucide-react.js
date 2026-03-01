// src/__mocks__/lucide-react.js
// Mocks all lucide-react icons as simple passthrough components.
// Avoids transpiling the entire ESM icon library in every test run.
const React = require('react');

const createIcon = (name) =>
  React.forwardRef(({ size = 24, color = 'currentColor', strokeWidth = 2, className, ...props }, ref) =>
    React.createElement('svg', {
      ref,
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      strokeWidth,
      className,
      'data-testid': `icon-${name}`,
      ...props,
    })
  );

// Proxy: any named export (Bookmark, TrendingUp, etc.) returns a stub icon
module.exports = new Proxy(
  {},
  {
    get: (_, name) => {
      if (name === '__esModule') return true;
      if (name === 'default') return module.exports;
      return createIcon(name);
    },
  }
);
