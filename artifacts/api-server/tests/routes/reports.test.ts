import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import reportsRouter from '../../src/routes/reports';
import { resetDb, seedTable } from '@workspace/db';

describe('Reports', () => {
  beforeEach(() => resetDb());

  it('GET /reports/pl requires from/to', async () => {
    const res = await request(express().use(reportsRouter)).get('/reports/pl');
    expect(res.status).toBe(400);
  });

  it('GET /reports/pl returns P&L data', async () => {
    seedTable('orders', [{ orderNumber: 'O1', productName: 'P1', status: 'delivered', sellPrice: '100', costPrice: '40', quantity: 1 }]);
    const res = await request(express().use(reportsRouter)).get('/reports/pl?from=2024-01-01&to=2026-01-01');
    expect(res.body.totalRevenue).toBe(100);
  });
});
