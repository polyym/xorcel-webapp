/** Recognized column type categories. Derived from the constant so they stay in sync. */
const COLUMN_TYPES = ['int', 'str'] as const;
export type ColumnType = typeof COLUMN_TYPES[number];

export interface ColumnInfo {
  name: string;
  duckType: string;
  type: ColumnType;
  samples: unknown[];
}

export interface FileState {
  fileName: string;
  fileSize: number;
  rowCount: number;
  columns: ColumnInfo[];
  sampleRows: Record<string, unknown>[];
  loaded: boolean;
}

export interface FileData {
  fileName: string;
  fileSize: number;
  rowCount: number;
  columns: ColumnInfo[];
  sampleRows: Record<string, unknown>[];
}

let fileName = $state('');
let fileSize = $state(0);
let rowCount = $state(0);
let columns: ColumnInfo[] = $state([]);
let sampleRows: Record<string, unknown>[] = $state([]);
let loaded = $state(false);

export function getFile(): FileState {
  return { fileName, fileSize, rowCount, columns, sampleRows, loaded };
}

export function setFile(data: FileData): void {
  fileName = data.fileName;
  fileSize = data.fileSize;
  rowCount = data.rowCount;
  columns = data.columns;
  sampleRows = data.sampleRows;
  loaded = true;
}

export function resetFile(): void {
  fileName = '';
  fileSize = 0;
  rowCount = 0;
  columns = [];
  sampleRows = [];
  loaded = false;
}
