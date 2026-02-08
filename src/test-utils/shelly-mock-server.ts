import { readdir } from 'node:fs/promises';
import path from 'node:path';
import type { Server } from 'bun';
import type { EMDataResponse } from '../lib/ShellyService';

const MOCK_DATA_PATH = path.resolve(__dirname, '../../_mock-data/EMData');

export interface MockServerData {
  server: Server;
  host: string;
  mockDataTstamps: number[];
  mockData: Record<string, EMDataResponse>;
}

export async function createMockServer(port = 0): Promise<MockServerData> {
  const mockData: Record<string, EMDataResponse> = {};
  let mockDataTstamps: number[] = [];

  // Preload all mock data by scanning the _mock-data/EMData directory
  const files = await readdir(MOCK_DATA_PATH);
  const jsonFiles = files.filter((file: string) => file.endsWith('.json'));
  for (const file of jsonFiles) {
    const ts = file.replace('.json', '');
    mockData[ts] = await Bun.file(path.join(MOCK_DATA_PATH, file)).json();
  }
  mockDataTstamps = Object.keys(mockData).map(Number).sort();

  // Create a mock server to test the ShellyService
  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      // Handle EMData.GetData requests
      if (url.pathname === '/rpc/EMData.GetData') {
        const ts = url.searchParams.get('ts');
        if (!ts) {
          return new Response('Missing ts parameter', { status: 400 });
        }

        const mockDataTstamps = Object.keys(mockData).sort();
        const firstTstamp = mockDataTstamps[0];
        const lastTstamp = mockDataTstamps[mockDataTstamps.length - 1];
        let data = mockData[ts];
        if (!data) {
          // If ts is before the first timestamp, return the data of the first timestamp
          if (parseInt(ts, 10) < parseInt(firstTstamp, 10)) {
            data = mockData[firstTstamp];
          }
          // If ts is after the last timestamp, return a empty data object
          else if (parseInt(ts, 10) > parseInt(lastTstamp, 10)) {
            data = {
              keys: mockData[lastTstamp].keys,
              data: [],
            };
          } else {
            return new Response(`No data available for timestamp ${ts}`, {
              status: 400,
              headers: { 'Content-Type': 'text/plain' },
            });
          }
        }

        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Handle Shelly.GetStatus requests
      if (url.pathname === '/rpc/Shelly.GetStatus') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response('Not Found', { status: 404 });
    },
  });

  return {
    server,
    host: `127.0.0.1:${server.port}`,
    mockDataTstamps,
    mockData,
  };
}
