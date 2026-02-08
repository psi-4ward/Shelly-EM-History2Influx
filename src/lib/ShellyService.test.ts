import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createMockServer, type MockServerData } from '../test-utils/shelly-mock-server';
import { ShellyService } from './ShellyService';

describe.only('ShellyService E2E', () => {
  let mockServer: MockServerData;

  beforeAll(async () => {
    mockServer = await createMockServer();
  });

  afterAll(() => {
    mockServer.server.stop();
  });

  test('should fetch subsequent history data', async () => {
    const { mockDataTstamps } = mockServer;
    const ts = mockDataTstamps[mockDataTstamps.length - 3];
    const shellyService = new ShellyService({
      host: mockServer.host,
      tags: { device_name: 'test' },
    });
    const history = await shellyService.getHistory(ts);

    // calculate the expected length of the history
    const expectedLength =
      mockServer.mockData[mockDataTstamps[mockDataTstamps.length - 3]].data[0].values.length +
      mockServer.mockData[mockDataTstamps[mockDataTstamps.length - 2]].data[0].values.length +
      mockServer.mockData[mockDataTstamps[mockDataTstamps.length - 1]].data[0].values.length;

    expect(history).toHaveLength(expectedLength);
    expect(history[0].timestamp).toBe(ts);
    expect(history[1].timestamp).toBe(ts + 60);

    // Verify total calculations for the first entry
    const entry = history[0];

    // Verify total active energy
    const expectedTotalEnergy =
      entry.a_total_act_energy + entry.b_total_act_energy + entry.c_total_act_energy;
    expect(entry.total_act_energy).toBe(expectedTotalEnergy);

    // Verify total active return energy
    const expectedTotalRetEnergy =
      entry.a_total_act_ret_energy + entry.b_total_act_ret_energy + entry.c_total_act_ret_energy;
    expect(entry.total_act_ret_energy).toBe(expectedTotalRetEnergy);
  });

  test('should test connection successfully', async () => {
    const shellyService = new ShellyService({
      host: mockServer.host,
      tags: { device_name: 'test' },
    });
    expect(shellyService.testConnection()).resolves;
  });
});
