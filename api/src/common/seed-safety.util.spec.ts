import { checkSeedDatabaseUrl } from './seed-safety.util';

describe('checkSeedDatabaseUrl', () => {
  it('accepts the dedicated local preview database URL', () => {
    const result = checkSeedDatabaseUrl(
      'postgresql://someuser@localhost:5433/b4f_board?schema=public',
    );
    expect(result.safe).toBe(true);
  });

  it('accepts 127.0.0.1 as an equivalent local host', () => {
    const result = checkSeedDatabaseUrl('postgresql://someuser@127.0.0.1:5433/b4f_board');
    expect(result.safe).toBe(true);
  });

  it('rejects a non-local host', () => {
    const result = checkSeedDatabaseUrl(
      'postgresql://user@production-db.example.com:5433/b4f_board',
    );
    expect(result.safe).toBe(false);
    expect(result.reason).toMatch(/host/);
  });

  it('rejects an unexpected port', () => {
    const result = checkSeedDatabaseUrl('postgresql://user@localhost:5432/b4f_board');
    expect(result.safe).toBe(false);
    expect(result.reason).toMatch(/port/);
  });

  it('rejects an unexpected database name', () => {
    const result = checkSeedDatabaseUrl('postgresql://user@localhost:5433/some_other_db');
    expect(result.safe).toBe(false);
    expect(result.reason).toMatch(/database name/);
  });

  it('rejects a missing DATABASE_URL', () => {
    const result = checkSeedDatabaseUrl(undefined);
    expect(result.safe).toBe(false);
    expect(result.reason).toMatch(/not set/);
  });

  it('rejects a malformed connection string', () => {
    const result = checkSeedDatabaseUrl('not-a-url');
    expect(result.safe).toBe(false);
    expect(result.reason).toMatch(/valid connection URL/);
  });
});
