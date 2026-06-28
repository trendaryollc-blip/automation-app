import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import reportsRouter from '../../src/routes/reports';
import { resetDb, seedTable } from '@workspace/db';

const app = express()
  .use(reportsRouter)
  .use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('REPORTS ROUTE ERROR', err);
    if (err instanceof Error) {
      res.status(500).json({ error: err.message, stack: err.stack });
    } else {
      res.status(500).json({ error: String(err) });
    }
  });

describe('Reports', () => {
  beforeEach(() => resetDb());

  it('GET /reports/pl requires from/to', async () => {
    const res = await request(express().use(reportsRouter)).get('/reports/pl');
    expect(res.status).toBe(400);
  });

  it('GET /reports/pl returns P&L data', async () => {
    seedTable('orders', [{ orderNumber: 'O1', productName: 'P1', status: 'delivered', sellPrice: '100', costPrice: '40', quantity: 1, createdAt: '2025-01-01' }]);
    const res = await request(express().use(reportsRouter)).get('/reports/pl?from=2024-01-01&to=2026-01-01');
    console.log('REPORTS DEBUG', res.status, res.body);
    expect(res.body.totalRevenue).toBe(100);
  });
});
