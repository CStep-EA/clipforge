// src/__mocks__/app-params.js
// Mocks app-params so import.meta.env is never evaluated in tests
module.exports = {
  appParams: {
    appId: 'test-app-id',
    token: null,
    fromUrl: 'http://localhost/',
    functionsVersion: null,
    appBaseUrl: 'http://localhost/',
  },
};
