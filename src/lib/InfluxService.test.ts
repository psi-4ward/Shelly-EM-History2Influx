import { afterAll, describe, expect, test } from 'bun:test';
import { createInfluxService } from './InfluxService';

const TEST_MEASUREMENT = 'test_measurement';

describe('InfluxService E2E Tests', () => {
  const services = [
    {
      name: 'InfluxDB v1.8',
      config: {
        version: 1,
        host: '127.0.0.1',
        port: 18086,
        database: 'shelly_data',
      },
    },
    {
      name: 'InfluxDB v2',
      config: {
        version: 2,
        url: 'http://127.0.0.1:18087',
        token: 'my-super-secret-auth-token',
        org: 'shelly',
        bucket: 'shelly_data',
      },
    },
  ] as const;

  for (const { name, config } of services) {
    describe(name, () => {
      const influx = createInfluxService(config);

      afterAll(async () => {
        await influx.close();
      });

      test('should write and read points', async () => {
        const timestamp = Math.floor(Date.now() / 1000);
        const point = {
          measurement: TEST_MEASUREMENT,
          fields: { total_act_energy: 42.5 },
          timestamp,
        };

        // Write point
        await influx.bulkWrite([point]);

        // Get last timestamp
        const lastTimestamp = await influx.getLastTimestamp(TEST_MEASUREMENT);
        expect(lastTimestamp).not.toBeNull();

        // The returned timestamp should be close to our written timestamp
        const timeDiff = Math.abs(lastTimestamp! - timestamp);
        expect(timeDiff).toBeLessThan(1); // Less than 1 second difference
      });

      test('should handle multiple points', async () => {
        const now = Math.floor(Date.now() / 1000);
        const points = [
          {
            measurement: TEST_MEASUREMENT,
            fields: { value: 1 },
            timestamp: now - 2,
          },
          {
            measurement: TEST_MEASUREMENT,
            fields: { value: 2 },
            timestamp: now - 1,
          },
          {
            measurement: TEST_MEASUREMENT,
            fields: { value: 3 },
            timestamp: now,
          },
        ];

        await influx.bulkWrite(points);

        const lastTimestamp = (await influx.getLastTimestamp(TEST_MEASUREMENT))!;
        expect(lastTimestamp).not.toBeNull();

        const timeDiff = Math.abs(lastTimestamp - now);
        expect(timeDiff).toBeLessThan(1); // Less than 1 second difference
      });

      test('should return null for non-existent measurement', async () => {
        const lastTimestamp = await influx.getLastTimestamp('non_existent_measurement');
        expect(lastTimestamp).toBeNull();
      });
    });
  }
});
