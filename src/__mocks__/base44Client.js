// src/__mocks__/base44Client.js
// Mocks the entire base44 API client so tests never touch
// app-params.js or import.meta.env.
// IMPORTANT: All entity mock fns are stable references (not re-created
// per Proxy access) so tests can call .mockResolvedValue() on them.

const makeEntityMock = () => ({
  list:   jest.fn().mockResolvedValue([]),
  get:    jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue({}),
  delete: jest.fn().mockResolvedValue({}),
  filter: jest.fn().mockResolvedValue([]),
});

// Pre-create stable entity mocks for every entity used in the codebase
const entities = {
  UserSubscription:  makeEntityMock(),
  PremiumTrial:      makeEntityMock(),
  SpecialAccount:    makeEntityMock(),
  SavedItem:         makeEntityMock(),
  SupportTicket:     makeEntityMock(),
  SupportMessage:    makeEntityMock(),
  SupportDoc:        makeEntityMock(),
  UserReferral:      makeEntityMock(),
  UserFriend:        makeEntityMock(),
  FriendInvite:      makeEntityMock(),
  FamilyGroup:       makeEntityMock(),
  FamilyMember:      makeEntityMock(),
  UserIntegration:   makeEntityMock(),
  Notification:      makeEntityMock(),
  AdminLog:          makeEntityMock(),
  DevLog:            makeEntityMock(),
  RateLimitEvent:    makeEntityMock(),
  FeedbackEntry:     makeEntityMock(),
};

// Proxy handles any entity not explicitly listed above
const entityProxy = new Proxy(entities, {
  get: (target, name) => {
    if (!(name in target)) target[name] = makeEntityMock();
    return target[name];
  },
});

const base44 = {
  entities: entityProxy,
  auth: {
    me:     jest.fn().mockResolvedValue({ id: 'test-user', email: 'test@clipforge.com', full_name: 'Test User' }),
    login:  jest.fn().mockResolvedValue({}),
    logout: jest.fn().mockResolvedValue({}),
  },
  integrations: {
    Core: {
      SendEmail:   jest.fn().mockResolvedValue({}),
      InvokeLLM:   jest.fn().mockResolvedValue({ result: '' }),
      UploadFile:  jest.fn().mockResolvedValue({ url: '' }),
    },
  },
};

module.exports = { base44 };
