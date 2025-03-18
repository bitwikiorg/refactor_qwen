
import http from 'http';
import { expect } from 'chai';

// Basic API validation tests
const BASE_URL = 'http://localhost:3000';

describe('API Endpoints', () => {
  // Terminal endpoints
  it('Terminal API should be accessible', async () => {
    const response = await fetch(`${BASE_URL}/api/terminal/status`);
    expect(response.status).to.be.oneOf([200, 401]); // Either OK or Auth required
  });
  
  // Research endpoints
  it('Research API should be accessible', async () => {
    const response = await fetch(`${BASE_URL}/api/v2/research/status`);
    expect(response.status).to.be.oneOf([200, 401]); // Either OK or Auth required
  });
  
  // Memory endpoints
  it('Memory API should be accessible', async () => {
    const response = await fetch(`${BASE_URL}/api/memory/status`);
    expect(response.status).to.be.oneOf([200, 401]); // Either OK or Auth required
  });
});
