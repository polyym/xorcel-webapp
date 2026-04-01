import * as duckdb from '@duckdb/duckdb-wasm';
import duckdbWorkerUrl from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import duckdbWasmUrl from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import type { ColumnInfo } from '../stores/file.svelte.ts';

/** Shape of a row returned by DuckDB DESCRIBE queries. */
interface SchemaRow {
  column_name: string;
  column_type: string;
}

/** Structured error for DuckDB query failures, preserving the SQL that caused the error. */
class QueryError extends Error {
  readonly sql: string;
  override readonly cause: unknown;

  constructor(message: string, sql: string, cause: unknown) {
    super(message, { cause });
    this.name = 'QueryError';
    this.sql = sql;
    this.cause = cause;
  }
}

/** Execute a SQL query, wrapping failures in a QueryError with context. */
async function runQuery(conn: duckdb.AsyncDuckDBConnection, sql: string): Promise<{ toArray(): unknown[] }> {
  try {
    return await conn.query(sql);
  } catch (e) {
    throw new QueryError(`DuckDB query failed: ${(e as Error).message ?? e}`, sql, e);
  }
}

/**
 * Convert a DuckDB result row proxy to a plain object.
 * DuckDB-WASM rows are Proxy objects with a toJSON() method — this is the
 * only supported way to access their data as plain key-value pairs.
 */
function toJson(row: unknown): Record<string, unknown> {
  return (row as { toJSON(): Record<string, unknown> }).toJSON();
}

/**
 * Parse a DESCRIBE result row into a typed SchemaRow.
 * DuckDB DESCRIBE always returns {column_name, column_type, ...} but the
 * WASM bindings don't expose a typed interface for it.
 */
function toSchemaRow(row: unknown): SchemaRow {
  return toJson(row) as unknown as SchemaRow;
}

/** Table name for the primary imported data. */
const DATA_TABLE = 'data';
/** Temporary table used during schema auto-detection. */
const TEMP_TABLE = 'data_tmp';
/** Virtual file name for COPY TO CSV output. */
const OUTPUT_FILE = '_xorcel_output.csv';
/** Number of rows shown in the preview grid. */
const PREVIEW_ROW_COUNT = 5;
/** Number of sample values displayed per column in the column picker. */
const SAMPLE_VALUE_COUNT = 3;
/**
 * Row-count threshold above which we warn users about potential memory pressure.
 * DuckDB-WASM loads the full dataset into browser memory — very large files
 * can exhaust the tab's heap and crash silently.
 */
const ROW_COUNT_WARNING_THRESHOLD = 500_000;

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;
let dbWorker: Worker | null = null;
let registeredFileName: string | null = null;

/**
 * SQL escaping helpers.
 *
 * DuckDB-WASM's `conn.prepare()` supports value-parameter binding, but this
 * codebase primarily interpolates *identifiers* (table/column names) and DDL,
 * which cannot be parameterized in any SQL engine. The only interpolated value
 * is the XOR key, which is always a numeric BigInt — not injectable.
 *
 * These helpers are still used defensively for file names and column names
 * that originate from user-uploaded CSVs.
 */

/** Escape a string for use in a SQL single-quoted literal (doubles single quotes). */
function escSql(s: string): string {
  return s.replace(/'/g, "''");
}

/** Escape a string for use as a SQL double-quoted identifier (doubles double quotes). */
function escId(s: string): string {
  return s.replace(/"/g, '""');
}

const INT_TYPES = new Set([
  'TINYINT', 'SMALLINT', 'INTEGER', 'BIGINT', 'HUGEINT',
  'UTINYINT', 'USMALLINT', 'UINTEGER', 'UBIGINT', 'UHUGEINT',
  'INT1', 'INT2', 'INT4', 'INT8', 'INT16', 'INT32', 'INT64', 'INT128',
  'SHORT', 'INT', 'LONG', 'SIGNED',
]);

function isIntType(typeName: string): boolean {
  const upper = typeName.toUpperCase().trim();
  if (INT_TYPES.has(upper)) return true;
  if (upper.includes('INT')) return true;
  return false;
}

async function getDb(): Promise<duckdb.AsyncDuckDB> {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    try {
      if (typeof SharedArrayBuffer === 'undefined') {
        throw new Error(
          'SharedArrayBuffer is not available. This usually means the server is missing ' +
          'Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers. ' +
          'DuckDB-WASM requires these headers to function.',
        );
      }
      const worker = new Worker(duckdbWorkerUrl, { type: 'module' });
      dbWorker = worker;
      const logger = new duckdb.ConsoleLogger();
      const db = new duckdb.AsyncDuckDB(logger, worker);
      await db.instantiate(duckdbWasmUrl);
      return db;
    } catch (e) {
      // Reset so a retry is possible (e.g., after a transient network failure)
      dbPromise = null;
      throw new Error(
        "Couldn't load the CSV processor — try refreshing the page. " +
        'If the problem persists, your browser may not support WebAssembly or SharedArrayBuffer. ' +
        'A recent version of Chrome, Edge, or Firefox should work.',
        { cause: e },
      );
    }
  })();
  return dbPromise;
}

/** Whether the DuckDB engine has been fully initialized. */
export function isDbReady(): boolean {
  return dbPromise !== null;
}

/**
 * Ensure the DuckDB WASM engine is initialized.
 * Call this before loadCsv to show a separate "loading engine" state
 * while the ~8 MB WASM binary downloads.
 */
export async function ensureDb(): Promise<void> {
  await getDb();
}

/** Terminate the DuckDB instance and its worker to free memory. */
export async function terminateDb(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      await db.terminate();
    } catch { /* already terminated or failed */ }
    dbPromise = null;
  }
  if (dbWorker) {
    dbWorker.terminate();
    dbWorker = null;
  }
  registeredFileName = null;
}

export interface LoadCsvResult {
  fileName: string;
  fileSize: number;
  rowCount: number;
  columns: ColumnInfo[];
  sampleRows: Record<string, unknown>[];
  /** Non-empty when the dataset is large enough to risk browser memory pressure. */
  warning?: string;
}

export async function loadCsv(file: File): Promise<LoadCsvResult> {
  const db = await getDb();
  const conn = await db.connect();

  try {
    await runQuery(conn, `DROP TABLE IF EXISTS ${DATA_TABLE}`);

    if (registeredFileName) {
      try { await db.dropFile(registeredFileName); } catch { /* already gone */ }
    }

    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (e) {
      throw new Error(
        `Couldn't read the file into memory. At ${(file.size / 1024 / 1024).toFixed(1)} MB, it may be too large for your browser. ` +
        'Try closing other tabs or using a smaller file.',
        { cause: e },
      );
    }
    try {
      await db.registerFileBuffer(file.name, new Uint8Array(arrayBuffer));
    } catch (e) {
      throw new Error(
        `Not enough memory to load this file (${(file.size / 1024 / 1024).toFixed(1)} MB). ` +
        'Try closing other tabs or using a smaller file.',
        { cause: e },
      );
    }
    registeredFileName = file.name;

    const safeName = escSql(file.name);

    // Two-pass import: first auto-detect to discover integer columns, then
    // re-import with non-integer columns forced to VARCHAR so original string
    // values (e.g., dates, IDs with leading zeros) are preserved exactly.
    await runQuery(conn, `CREATE TABLE ${TEMP_TABLE} AS SELECT * FROM read_csv_auto('${safeName}') LIMIT 0`);
    const tmpSchema = await runQuery(conn, `DESCRIBE ${TEMP_TABLE}`);
    const tmpRows = tmpSchema.toArray().map((r: unknown) => toSchemaRow(r));
    await runQuery(conn, `DROP TABLE ${TEMP_TABLE}`);

    const colTypes = tmpRows.map((r) => {
      const type = isIntType(r.column_type) ? r.column_type : 'VARCHAR';
      return `'${escSql(r.column_name)}': '${type}'`;
    });

    await runQuery(conn, `CREATE TABLE ${DATA_TABLE} AS SELECT * FROM read_csv_auto('${safeName}', columns = {${colTypes.join(', ')}})`);

    const schemaResult = await runQuery(conn, `DESCRIBE ${DATA_TABLE}`);
    const schemaRows = schemaResult.toArray().map((r: unknown) => toSchemaRow(r));
    const columns: ColumnInfo[] = schemaRows.map((r) => ({
      name: r.column_name,
      duckType: r.column_type,
      type: isIntType(r.column_type) ? 'int' as const : 'str' as const,
      samples: [] as unknown[],
    }));

    const sampleResult = await runQuery(conn, `SELECT * FROM ${DATA_TABLE} LIMIT ${PREVIEW_ROW_COUNT}`);
    const sampleRows: Record<string, unknown>[] = sampleResult.toArray().map((r: unknown) => toJson(r));

    for (const col of columns) {
      col.samples = sampleRows.slice(0, SAMPLE_VALUE_COUNT).map(r => r[col.name]);
    }

    const countResult = await runQuery(conn, `SELECT count(*) as c FROM ${DATA_TABLE}`);
    const countRow = toJson(countResult.toArray()[0]);
    const rowCount = Number(countRow.c);

    const warning = rowCount > ROW_COUNT_WARNING_THRESHOLD
      ? `This file has ${rowCount.toLocaleString()} rows. Very large datasets may slow down your browser or run out of memory during processing.`
      : undefined;

    return {
      fileName: file.name,
      fileSize: file.size,
      rowCount,
      columns,
      sampleRows,
      warning,
    };
  } finally {
    await conn.close();
  }
}

export async function processXor(selectedColumns: Set<string>, key: bigint | number): Promise<string> {
  const db = await getDb();
  const conn = await db.connect();

  try {
    const selectParts: string[] = [];
    const schemaResult = await runQuery(conn, `DESCRIBE ${DATA_TABLE}`);
    const allCols = schemaResult.toArray().map((r: unknown) => toSchemaRow(r));

    for (const col of allCols) {
      const safeCol = escId(col.column_name);
      if (selectedColumns.has(col.column_name)) {
        selectParts.push(`xor("${safeCol}", ${key}) as "${safeCol}"`);
      } else {
        selectParts.push(`"${safeCol}"`);
      }
    }

    const query = `SELECT ${selectParts.join(', ')} FROM ${DATA_TABLE}`;

    // COPY TO keeps CSV serialization in WASM — avoids materializing every row as a JS object.
    try {
      await runQuery(conn, `COPY (${query}) TO '${OUTPUT_FILE}' (FORMAT CSV, HEADER)`);
    } catch (e) {
      if (e instanceof Error && /memory|alloc/i.test(e.message)) {
        throw new Error(
          'Ran out of memory while processing. The dataset may be too large to transform in the browser. ' +
          'Try a smaller file or close other tabs to free up memory.',
          { cause: e },
        );
      }
      throw e;
    }
    try {
      const csvBytes = await db.copyFileToBuffer(OUTPUT_FILE);
      return new TextDecoder().decode(csvBytes);
    } finally {
      try { await db.dropFile(OUTPUT_FILE); } catch { /* best-effort cleanup */ }
    }
  } finally {
    await conn.close();
  }
}
