import { afterAll, describe, expect, test } from 'bun:test';
import { createInfluxService } from './InfluxService';

const TEST_MEASUREMENT = 'test_measurement';
const TEST_DEVICE = 'shellyem-test';

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
          tags: { device_name: TEST_DEVICE },
        };

        // Write point
        await influx.bulkWrite([point]);

        // Get last timestamp
        const lastTimestamp = await influx.getLastTimestamp(TEST_MEASUREMENT, TEST_DEVICE);
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
            fields: { total_act_energy: 1 },
            timestamp: now - 2,
            tags: { device_name: TEST_DEVICE },
          },
          {
            measurement: TEST_MEASUREMENT,
            fields: { total_act_energy: 2 },
            timestamp: now - 1,
            tags: { device_name: TEST_DEVICE },
          },
          {
            measurement: TEST_MEASUREMENT,
            fields: { total_act_energy: 3 },
            timestamp: now,
            tags: { device_name: TEST_DEVICE },
          },
        ];

        await influx.bulkWrite(points);

        const lastTimestamp = (await influx.getLastTimestamp(TEST_MEASUREMENT, TEST_DEVICE))!;
        expect(lastTimestamp).not.toBeNull();

        const timeDiff = Math.abs(lastTimestamp - now);
        expect(timeDiff).toBeLessThan(1); // Less than 1 second difference
      });

      test('should return null for non-existent measurement', async () => {
        const lastTimestamp = await influx.getLastTimestamp(
          'non_existent_measurement',
          TEST_DEVICE
        );
        expect(lastTimestamp).toBeNull();
      });

      test('should handle multiple devices correctly', async () => {
        const now = Math.floor(Date.now() / 1000);
        const device1 = 'shellyem-123';
        const device2 = 'shellyem-456';

        const points = [
          {
            measurement: TEST_MEASUREMENT,
            fields: { total_act_energy: 10 },
            timestamp: now - 60, // 60 seconds ago
            tags: { device_name: device1 },
          },
          {
            measurement: TEST_MEASUREMENT,
            fields: { total_act_energy: 20 },
            timestamp: now - 7200, // 2 hours ago
            tags: { device_name: device2 },
          },
        ];

        await influx.bulkWrite(points);

        // Check device1's last timestamp (60s ago)
        const lastTimestamp1 = await influx.getLastTimestamp(TEST_MEASUREMENT, device1);
        expect(lastTimestamp1).not.toBeNull();
        expect(Math.abs(lastTimestamp1! - (now - 60))).toBeLessThan(1);

        // Check device2's last timestamp (2h ago)
        const lastTimestamp2 = await influx.getLastTimestamp(TEST_MEASUREMENT, device2);
        expect(lastTimestamp2).not.toBeNull();
        expect(Math.abs(lastTimestamp2! - (now - 7200))).toBeLessThan(1);
      });
    });
  }
});
