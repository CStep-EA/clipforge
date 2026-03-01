// jest.config.cjs
module.exports = {
  // Use jsdom so React components can render (document, window, etc.)
  testEnvironment: 'jest-environment-jsdom',

  // Run setupTests.ts after jsdom is ready
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],

  moduleNameMapper: {
    // CSS imports → identity-obj-proxy (returns class names as-is)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',

    // Mock base44 API client — prevents import.meta.env in app-params.js
    '^@/api/base44Client$': '<rootDir>/src/__mocks__/base44Client.js',
    // Mock app-params directly (belt + suspenders)
    '^@/lib/app-params$': '<rootDir>/src/__mocks__/app-params.js',

    // General @ alias → src/
    '^@/(.*)$': '<rootDir>/src/$1',

    // framer-motion → stub (avoids ESM-only package issues)
    '^framer-motion$': '<rootDir>/src/__mocks__/framer-motion.js',

    // lucide-react → stub (ESM-only, ~1000 icons — too slow to transpile)
    '^lucide-react$': '<rootDir>/src/__mocks__/lucide-react.js',
  },

  // babel-jest handles ALL file types: JS, JSX, TS, TSX
  // .babelrc provides: preset-env (CJS output), preset-react (JSX),
  // preset-typescript (strips types), babel-plugin-transform-import-meta
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },

  // Transform ESM packages that ship without CommonJS builds.
  // @tanstack/react-query is ESM-only, must be transpiled by babel-jest.
  transformIgnorePatterns: [
    '/node_modules/(?!(@base44/sdk|@base44|@tanstack)/)',
  ],

  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
};
