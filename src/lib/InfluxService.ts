/**
 * @fileoverview Service layer for interacting with InfluxDB (v1.x and v2.x).
 * Provides a unified interface for database operations like querying and writing points,
 * abstracting away the differences between InfluxDB versions through separate implementations.
 */
import { InfluxDB as InfluxDBv2, Point, type WriteApi } from '@influxdata/influxdb-client';
import debug from 'debug';
import { type IPoint, InfluxDB as InfluxDBv1 } from 'influx';

const d = debug('s2i:InfluxService');

export type InfluxPoint = IPoint | Point;

interface InfluxConfigV1 {
  version: 1;
  host: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
}

interface InfluxConfigV2 {
  version: 2;
  url: string;
  token: string;
  org: string;
  bucket: string;
}

export type InfluxConfig = InfluxConfigV1 | InfluxConfigV2;

export type PointInput = {
  measurement: string;
  fields: Record<string, number>;
  timestamp: number;
  tags?: Record<string, string>;
};

/**
 * Abstract base class for InfluxDB operations
 */
abstract class BaseInfluxService {
  abstract query<T = Record<string, unknown>>(query: string): Promise<T[]>;
  abstract bulkWrite(points: PointInput[]): Promise<void>;
  abstract getLastTimestamp(measurement: string, deviceName: string): Promise<number | null>;
  abstract testConnection(): Promise<void>;
  abstract close(): Promise<void>;
}

/**
 * InfluxDB 1.x implementation
 */
class InfluxServiceV1 extends BaseInfluxService {
  private client: InfluxDBv1;

  constructor(private config: InfluxConfigV1) {
    super();
    d('initializing v1 client with host %s and database %s', config.host, config.database);
    this.client = new InfluxDBv1({
      host: config.host,
      port: config.port || 8086,
      database: config.database,
      username: config.username,
      password: config.password,
      options: {
        timeout: 15_000
      }
    });
  }

  async query<T = Record<string, unknown>>(query: string): Promise<T[]> {
    d('executing v1 query: %s', query);
    const results = await this.client.query<T>(query);
    d('query returned %d results', results.length);
    return results;
  }

  async bulkWrite(points: PointInput[]): Promise<void> {
    d('writing %d points to v1 influx', points.length);
    await this.client.writePoints(points, { precision: 's' });
    d('successfully wrote points');
  }

  async getLastTimestamp(measurement: string, deviceName: string): Promise<number | null> {
    d('getting last timestamp for measurement %s', measurement);
    const query = `
      SELECT time, total_act_energy 
      FROM ${measurement} 
      WHERE ("device_name"::tag = '${deviceName}') 
      ORDER BY time DESC LIMIT 1`;
    type TimeResult = { time: string; value: number };
    const results = await this.query<TimeResult>(query);
    const ts = results.length > 0 ? Math.floor(new Date(results[0].time).getTime() / 1000) : null;
    d('last timestamp for measurement %s: %d', measurement, ts);
    return ts;
  }

  async testConnection(): Promise<void> {
    d('testing connection to v1 influx');
    // First check if the connection works by querying databases
    const databases = await this.client.getDatabaseNames();
    
    // Then check if our target database exists
    if (!databases.includes(this.config.database)) {
      d('database %s does not exist', this.config.database);
      throw new Error(`Database '${this.config.database}' does not exist`);
    }
    
    d('connection to v1 influx successful');
  }

  async close(): Promise<void> {
    d('closing v1 client (no-op)');
    // No close needed for v1
  }
}

/**
 * InfluxDB 2.x implementation
 */
class InfluxServiceV2 extends BaseInfluxService {
  private client: InfluxDBv2;
  private writeApi: WriteApi;

  constructor(private config: InfluxConfigV2) {
    super();
    d('initializing v2 client with url %s and bucket %s', config.url, config.bucket);
    this.client = new InfluxDBv2({ url: config.url, token: config.token });
    this.writeApi = this.client.getWriteApi(config.org, config.bucket, 's');
  }

  async query<T = Record<string, unknown>>(fluxQuery: string): Promise<T[]> {
    d('executing v2 query: %s', fluxQuery);
    const queryApi = this.client.getQueryApi(this.config.org);
    const results = await queryApi.collectRows(fluxQuery);
    d('query returned %d results', results.length);
    return results as T[];
  }

  async bulkWrite(points: PointInput[]): Promise<void> {
    d('writing %d points to v2 influx', points.length);
    const influxPoints = points.map((p) => {
      const point = new Point(p.measurement);
      for (const [key, value] of Object.entries(p.fields)) {
        if (typeof value === 'number') {
          point.floatField(key, value);
        } else if (typeof value === 'boolean') {
          point.booleanField(key, value);
        } else {
          point.stringField(key, String(value));
        }
      }
      if (p.tags) {
        for (const [key, value] of Object.entries(p.tags)) {
          point.tag(key, value);
        }
      }
      point.timestamp(p.timestamp);
      return point;
    });
    this.writeApi.writePoints(influxPoints);
    await this.writeApi.flush();
    d('successfully wrote points');
  }

  async getLastTimestamp(measurement: string, deviceName: string): Promise<number | null> {
    d('getting last timestamp for measurement %s and device %s', measurement, deviceName);
    const query = `
      from(bucket: "${this.config.bucket}")
        |> range(start: -61d)
        |> filter(fn: (r) => r["_measurement"] == "${measurement}")
        |> filter(fn: (r) => r["device_name"] == "${deviceName}")
        |> filter(fn: (r) => r["_field"] == "total_act_energy")
        |> last()
    `;
    type TimeResult = { _time: string };
    const results = await this.query<TimeResult>(query);
    const ts = results.length > 0 ? Math.floor(new Date(results[0]._time).getTime() / 1000) : null;
    d('last timestamp for measurement %s: %d', measurement, ts);
    return ts;
  }

  async testConnection(): Promise<void> {
    d('testing connection to v2 influx');
    // Check if the bucket exists
    const query = `
      buckets()
      |> filter(fn: (r) => r.name == "${this.config.bucket}")
    `;
    
    const queryApi = this.client.getQueryApi(this.config.org);
    const results = await queryApi.collectRows(query);
    
    if (results.length === 0) {
      d('bucket %s does not exist', this.config.bucket);
      throw new Error(`Bucket '${this.config.bucket}' does not exist`);
    }
    
    d('connection to v2 influx successful');
  }

  async close(): Promise<void> {
    d('closing v2 client');
    await this.writeApi.close();
    d('successfully closed v2 client');
  }
}

/**
 * Factory function to create the appropriate InfluxDB service
 */
export function createInfluxService(config: InfluxConfig): BaseInfluxService {
  d('creating influx service for version %d', config.version);
  if (config.version === 1) {
    return new InfluxServiceV1(config);
  }
  return new InfluxServiceV2(config);
}
