import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import priceWatchRouter from '../../src/routes/price-watch';
import { resetDb, seedTable } from '@workspace/db';

describe('Price Watch', () => {
  beforeEach(() => resetDb());

  it('GET /price-watch returns empty', async () => {
    const res = await request(express().use(priceWatchRouter)).get('/price-watch');
    expect(res.body).toEqual([]);
  });

  it('POST /price-watch creates', async () => {
    const res = await request(express().use(priceWatchRouter)).post('/price-watch')
      .send({ name: 'Watch', url: 'https://ex.com' });
    expect(res.status).toBe(201);
  });

  it('POST /price-watch rejects missing fields', async () => {
    const res = await request(express().use(priceWatchRouter)).post('/price-watch').send({});
    expect(res.status).toBe(400);
  });
});
