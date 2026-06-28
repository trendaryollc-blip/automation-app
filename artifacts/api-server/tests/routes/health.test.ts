import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import healthRouter from '../../src/routes/health';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(healthRouter);
  return app;
}

describe('Health Route', () => {
  beforeEach(() => {
    const { resetDb } = require('@workspace/db');
    resetDb();
  });

  it('GET /healthz returns 200 with status ok', async () => {
    const app = createApp();
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
