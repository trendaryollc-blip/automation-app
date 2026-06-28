import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import customerInsightsRouter from '../../src/routes/customer-insights';
import { resetDb, seedTable } from '@workspace/db';

describe('Customer Insights', () => {
  beforeEach(() => resetDb());

  it('GET /orders/customer-insights returns aggregated data', async () => {
    seedTable('orders', [
      { orderNumber: 'O1', customerName: 'Alice', customerEmail: 'a@test.com', status: 'delivered', sellPrice: '100', profit: '30', quantity: 1 }
    ]);
    const res = await request(express().use(customerInsightsRouter)).get('/orders/customer-insights');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].customerName).toBe('Alice');
    expect(res.body[0].totalRevenue).toBe(100);
  });
});
