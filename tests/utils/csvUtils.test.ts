import { describe, it, expect, beforeAll } from 'vitest';
import { parseCSV } from '../../src/utils/csvUtils';
import { Class } from '../../src/types';

class NodeFileReader {
  result: string | null = null;
  onload: ((ev: any) => void) | null = null;
  onerror: ((ev: any) => void) | null = null;

  readAsText(file: File) {
    file.text()
      .then((text) => {
        this.result = text;
        this.onload?.({ target: this } as any);
      })
      .catch((err) => {
        this.onerror?.(err);
      });
  }
}

function createCSVFile(content: string) {
  return new File([content], 'test.csv', { type: 'text/csv' });
}

beforeAll(() => {
  // @ts-ignore
  globalThis.FileReader = NodeFileReader as any;
});

describe('parseCSV', () => {
  const classes: Class[] = [
    { id: '1', name: 'Class 1', grade: '1', teacher: 'A' },
  ];

  it('parses valid rows', async () => {
    const csv = `name,email,classId,parentIds\nAlice,alice@example.com,1,"p1,p2"\nBob,bob@example.com,1,"p3"`;
    const file = createCSVFile(csv);
    const { data, errors } = await parseCSV<any>(file, classes);

    expect(errors).toEqual([]);
    expect(data).toEqual([
      { name: 'Alice', email: 'alice@example.com', classId: '1', parentIds: ['p1', 'p2'] },
      { name: 'Bob', email: 'bob@example.com', classId: '1', parentIds: ['p3'] },
    ]);
  });

  it('reports invalid class IDs', async () => {
    const csv = `name,email,classId,parentIds\nAlice,alice@example.com,1,"p1,p2"\nCharlie,charlie@example.com,2,"p3"`;
    const file = createCSVFile(csv);
    const { data, errors } = await parseCSV<any>(file, classes);

    expect(data).toEqual([
      { name: 'Alice', email: 'alice@example.com', classId: '1', parentIds: ['p1', 'p2'] },
    ]);
    expect(errors).toEqual(["Row 2: Class ID '2' does not exist"]);
  });

  it('reports invalid email addresses', async () => {
    const csv = `name,email,classId\nAlice,alice@example.com,1\nBad,bademail,1`;
    const file = createCSVFile(csv);
    const { data, errors } = await parseCSV<any>(file, classes);

    expect(data).toEqual([
      { name: 'Alice', email: 'alice@example.com', classId: '1' },
    ]);
    expect(errors).toEqual(["Row 2: Valid email is required"]);
  });

  it('maps numeric parent IDs using lookup', async () => {
    const csv = `name,email,classId,parentIds\nAlice,alice@example.com,1,"1,2"`;
    const file = createCSVFile(csv);
    const lookup = { 1: 'uuid1', 2: 'uuid2' };
    const { data, errors } = await parseCSV<any>(file, classes, lookup);

    expect(errors).toEqual([]);
    expect(data).toEqual([
      { name: 'Alice', email: 'alice@example.com', classId: '1', parentIds: ['uuid1', 'uuid2'] },
    ]);
  });

  it('reports unmapped numeric parent IDs', async () => {
    const csv = `name,email,classId,parentIds\nAlice,alice@example.com,1,"1,3"`;
    const file = createCSVFile(csv);
    const lookup = { 1: 'uuid1' };
    const { data, errors } = await parseCSV<any>(file, classes, lookup);

    expect(data).toEqual([
      { name: 'Alice', email: 'alice@example.com', classId: '1', parentIds: ['uuid1'] },
    ]);
    expect(errors).toEqual(["Row 1: Parent IDs not found for [3]"]);
  });
});
