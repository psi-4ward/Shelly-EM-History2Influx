/**
 * @fileoverview Service layer for interacting with Shelly EM devices.
 * @docs https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/EMData/#emdatagetdata-example
 */

import debug from 'debug';
import type { PointInput } from './InfluxService';

const d = debug('s2i:ShellyService');

// Helper function to format timestamps
const formatDate = (timestamp: number) => new Date(timestamp * 1000).toISOString();

export type ShellyConfig = {
  host: string;
  username?: string;
  password?: string;
  tags: Record<string, string>;
  measurement?: string;
};

export type EMDataResponse = {
  keys?: string[];
  data: {
    ts: number;
    period: number;
    values: number[][];
  }[];
  next_record_ts?: number;
};

export type EMHistory = {
  timestamp: number;
  [key: string]: number;
}[];

/**
 * Service for interacting with Shelly EM devices
 */
export class ShellyService {
  protected readonly baseUrl: string;
  protected readonly authHeader?: string;
  protected readonly config: ShellyConfig;

  constructor(config: ShellyConfig) {
    this.baseUrl = `http://${config.host}`;
    this.config = config;
    if (config.username && config.password) {
      const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      this.authHeader = `Basic ${auth}`;
    }
    d('initialized for host %s', this.baseUrl);
  }

  /**
   * Fetch history data for a given time range using EMData.GetData RPC
   * @param fromTimestamp - Start timestamp in seconds
   * @param toTimestamp - End timestamp in seconds (optional)
   */
  async getHistory(fromTimestamp: number, toTimestamp?: number): Promise<EMHistory> {
    d(
      'fetching history from=%s to=%s',
      formatDate(fromTimestamp),
      toTimestamp ? formatDate(toTimestamp) : 'now'
    );
    let response = await this.fetchHistory(fromTimestamp, toTimestamp);
    const history = this.convertEMData(response);
    while (response.next_record_ts && response.next_record_ts > 0) {
      if (toTimestamp && response.next_record_ts > toTimestamp) {
        break;
      }
      d('fetching next page from ts=%s', formatDate(response.next_record_ts));
      response = await this.fetchHistory(response.next_record_ts, toTimestamp);
      history.push(...this.convertEMData(response));
    }
    d('fetched %d records', history.length);
    return history;
  }

  /**
   * Convert EMDataResponse to EMHistory format
   */
  protected convertEMData(response: EMDataResponse): EMHistory {
    const { keys = [], data } = response;
    const historyItems: EMHistory = [];

    // biome-ignore lint: I like forEach :p
    data.forEach(({ ts, period, values }) => {
      values.forEach((dataSet, index) => {
        // Calculate timestamp for this history-item
        const historyItem: EMHistory[number] = {
          timestamp: ts + index * period,
        };

        // Map values to their corresponding keys
        keys.forEach((key, valueIndex) => {
          historyItem[key] = dataSet[valueIndex];
        });

        // Calculate totals for each phase
        if (
          typeof historyItem.a_total_act_energy === 'number' &&
          typeof historyItem.b_total_act_energy === 'number' &&
          typeof historyItem.c_total_act_energy === 'number'
        ) {
          historyItem.total_act_energy =
            historyItem.a_total_act_energy +
            historyItem.b_total_act_energy +
            historyItem.c_total_act_energy;
        }
        if (
          typeof historyItem.a_total_act_ret_energy === 'number' &&
          typeof historyItem.b_total_act_ret_energy === 'number' &&
          typeof historyItem.c_total_act_ret_energy === 'number'
        ) {
          historyItem.total_act_ret_energy =
            historyItem.a_total_act_ret_energy +
            historyItem.b_total_act_ret_energy +
            historyItem.c_total_act_ret_energy;
        }

        historyItems.push(historyItem);
      });
    });

    return historyItems;
  }

  /**
   * Get the measurement name configured for this Shelly device
   */
  public getMeasurementName(): string {
    return this.config.measurement ?? 'shelly_em';
  }

  /**
   * Get the host name
   */
  public getHost(): string {
    return this.config.host;
  }

  /**
   * Get the device name
   */
  public getDeviceName(): string {
    return this.config.tags.device_name;
  }

  /**
   * Convert EMHistory items to InfluxDB points
   */
  public toInfluxPoints(history: EMHistory): PointInput[] {
    return history.map(({ timestamp, ...fields }) => ({
      measurement: this.getMeasurementName(),
      fields,
      timestamp,
      tags: this.config.tags,
    }));
  }

  /**
   * Fetch raw history data from the Shelly device
   * @param fromTimestamp - Start timestamp in seconds
   * @param toTimestamp - End timestamp in seconds (optional)
   */
  protected async fetchHistory(
    fromTimestamp: number,
    toTimestamp?: number
  ): Promise<EMDataResponse> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.authHeader) {
      headers.Authorization = this.authHeader;
    }

    const params = new URLSearchParams({
      id: '0',
      ts: fromTimestamp.toString(),
      ...(toTimestamp && { end_ts: toTimestamp.toString() }),
    });

    const url = `${this.baseUrl}/rpc/EMData.GetData?${params.toString()}`;
    d('fetching data from: %s', url);

    const response = await fetch(url, {
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch history: ${response.status} ${
          response.statusText
        }\n${await response.text()}`
      );
    }

    return response.json() as Promise<EMDataResponse>;
  }

  /**
   * Test the connection to the Shelly device
   */
  async testConnection(): Promise<boolean> {
    try {
      const headers: Record<string, string> = {};
      if (this.authHeader) {
        headers.Authorization = this.authHeader;
      }

      d('testing connection to %s', this.baseUrl);
      const response = await fetch(`${this.baseUrl}/rpc/Shelly.GetStatus`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: 1,
          method: 'Shelly.GetStatus',
        }),
      });
      d('connection test result: %s', response.ok);
      return response.ok;
    } catch (error) {
      d('connection test failed: %o', error);
      return false;
    }
  }
}
