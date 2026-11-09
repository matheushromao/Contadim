import { describe, expect, it } from 'vitest';

import { paginate, toSkipTake } from './pagination.js';

describe('pagination', () => {
  it('calcula skip/take', () => {
    expect(toSkipTake({ page: 1, pageSize: 20 })).toEqual({ skip: 0, take: 20 });
    expect(toSkipTake({ page: 3, pageSize: 10 })).toEqual({ skip: 20, take: 10 });
  });

  it('monta o envelope com total de páginas', () => {
    expect(paginate(['a'], 41, { page: 1, pageSize: 20 }).meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 41,
      totalPages: 3,
    });
    expect(paginate([], 0, { page: 1, pageSize: 20 }).meta.totalPages).toBe(1);
  });
});
