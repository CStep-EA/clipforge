// src/__mocks__/base44Client.js
// Mocks the entire base44 API client so tests never touch
// app-params.js or import.meta.env
const base44 = {
  entities: new Proxy({}, {
    get: (_, entityName) => ({
      list: jest.fn().mockResolvedValue([]),
      get: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      filter: jest.fn().mockResolvedValue([]),
    }),
  }),
  auth: {
    me: jest.fn().mockResolvedValue({ id: 'test-user', email: 'test@test.com', full_name: 'Test User' }),
    login: jest.fn().mockResolvedValue({}),
    logout: jest.fn().mockResolvedValue({}),
  },
  integrations: {
    Core: {
      SendEmail: jest.fn().mockResolvedValue({}),
      InvokeLLM: jest.fn().mockResolvedValue({ result: '' }),
      UploadFile: jest.fn().mockResolvedValue({ url: '' }),
    },
  },
};

module.exports = { base44 };
