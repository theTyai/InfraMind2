// server/__tests__/driftEngine.test.js
// Unit tests for the drift engine route/collection extraction and comparison logic.
// Run with: node --test server/__tests__/driftEngine.test.js

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normalizePath, extractRoutesFromCode, extractDbCollectionsFromCode } = require('../utils/driftEngine');

// ─── normalizePath ────────────────────────────────────────────────────────────

describe('normalizePath', () => {
  it('strips leading and trailing slashes', () => {
    assert.equal(normalizePath('/api/users/'), 'api/users');
  });

  it('normalizes path parameters to wildcard *', () => {
    assert.equal(normalizePath('/api/users/:id'), 'api/users/*');
  });

  it('handles empty input', () => {
    assert.equal(normalizePath(''), '');
    assert.equal(normalizePath(null), '');
  });

  it('deduplicates slashes', () => {
    assert.equal(normalizePath('//api//users//'), 'api/users');
  });

  it('lowercases path', () => {
    assert.equal(normalizePath('/API/Users'), 'api/users');
  });
});

// ─── extractRoutesFromCode ────────────────────────────────────────────────────

describe('extractRoutesFromCode', () => {
  it('extracts app.get routes', () => {
    const code = `app.get('/api/users', authMiddleware, handler)`;
    const routes = extractRoutesFromCode(code);
    assert.equal(routes.length, 1);
    assert.equal(routes[0].method, 'GET');
    assert.equal(routes[0].route, '/api/users');
  });

  it('extracts app.post routes', () => {
    const code = `app.post('/api/projects', handler)`;
    const routes = extractRoutesFromCode(code);
    assert.equal(routes.length, 1);
    assert.equal(routes[0].method, 'POST');
  });

  it('extracts multiple routes from one file', () => {
    const code = `
      router.get('/api/users', handler);
      router.post('/api/users', handler);
      router.delete('/api/users/:id', handler);
    `;
    const routes = extractRoutesFromCode(code);
    assert.equal(routes.length, 3);
  });

  it('ignores static file routes', () => {
    const code = `app.get('/assets/logo.png', handler)`;
    const routes = extractRoutesFromCode(code);
    assert.equal(routes.length, 0, 'Should ignore static file routes');
  });

  it('ignores external URLs', () => {
    const code = `fetch('https://api.example.com/data')`;
    const routes = extractRoutesFromCode(code);
    assert.equal(routes.length, 0);
  });
});

// ─── extractDbCollectionsFromCode ─────────────────────────────────────────────

describe('extractDbCollectionsFromCode', () => {
  it('extracts Firestore collections', () => {
    const code = `
      db.collection('users').doc(userId)
      db.collection('projects').get()
    `;
    const cols = extractDbCollectionsFromCode(code);
    assert.ok(cols.includes('users'));
    assert.ok(cols.includes('projects'));
  });

  it('extracts Mongoose models', () => {
    const code = `const User = mongoose.model('User', userSchema)`;
    const cols = extractDbCollectionsFromCode(code);
    assert.ok(cols.includes('user'));
  });

  it('extracts Prisma models', () => {
    const code = `model User {\n  id Int\n}\nmodel Post {\n  id Int\n}`;
    const cols = extractDbCollectionsFromCode(code, 'schema.prisma');
    assert.ok(cols.includes('user'));
    assert.ok(cols.includes('post'));
  });

  it('returns no duplicates', () => {
    const code = `
      db.collection('users').doc()
      db.collection('users').get()
    `;
    const cols = extractDbCollectionsFromCode(code);
    const uniqueUsers = cols.filter(c => c === 'users');
    assert.equal(uniqueUsers.length, 1);
  });
});
