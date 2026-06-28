import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import priceWatchRouter from '../../src/routes/price-watch';
import { resetDb } from '@workspace/db';

const app = express().use(express.json()).use(priceWatchRouter);

describe('Price Watch', () => {
  beforeEach(() => resetDb());

  it('GET /price-watch returns empty', async () => {
    const res = await request(app).get('/price-watch');
    expect(res.body).toEqual([]);
  });

  it('POST /price-watch creates', async () => {
    const res = await request(app).post('/price-watch')
      .send({ name: 'Watch', url: 'https://ex.com' });
    expect(res.status).toBe(201);
  });

  it('POST /price-watch rejects missing fields', async () => {
    const res = await request(app).post('/price-watch').send({});
    expect(res.status).toBe(400);
  });
});
