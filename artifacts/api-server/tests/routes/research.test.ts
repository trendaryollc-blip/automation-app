import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import researchRouter from '../../src/routes/research';
import { resetDb, seedTable } from '@workspace/db';

const app = express().use(express.json()).use(researchRouter);

describe('Research', () => {
  beforeEach(() => resetDb());

  it('POST /research/analyze rejects missing query', async () => {
    const res = await request(app).post('/research/analyze').send({});
    expect(res.status).toBe(400);
  });

  it('POST /research/analyze returns fallback', async () => {
    const res = await request(app).post('/research/analyze')
      .send({ query: 'wireless earbuds' });
    expect(res.body).toHaveProperty('demandScore');
    expect(res.body).toHaveProperty('verdict');
  });

  it('GET /research/history returns empty', async () => {
    const res = await request(express().use(researchRouter)).get('/research/history');
    expect(res.body).toEqual([]);
  });
});
