import debug from 'debug';
import { getConfig } from './config';
import { createInfluxService } from './lib/InfluxService';
import { type EMHistory, ShellyService } from './lib/ShellyService';
import { logger } from './lib/Logger';

// Debug namespace
const d = debug('s2i');

// Icons for console output
const icons = {
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
  success: '✅',
} as const;

logger.info(`🚀 Shelly EM History 2 Influx ${process.env.SHELLY_EM_HISTORY2INFLUX_VERSION || 'development-version'}`);

const config = getConfig();

// Global state for cleanup
const services: { influx: ReturnType<typeof createInfluxService>; shelly: ShellyService[] } = {
  influx: createInfluxService(config.influx),
  shelly: config.shelly.map((cfg) => new ShellyService(cfg)),
};

// Track active timeouts for cleanup
const activeTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();

/**
 * Scrape data from a single Shelly device and write to InfluxDB
 */
async function scrapeDevice(shelly: ShellyService): Promise<void> {
  const measurement = shelly.getMeasurementName();

  let lastTimestamp = 0;
  try {
    lastTimestamp = (await services.influx.getLastTimestamp(measurement, shelly.getDeviceName())) ?? 0;
    // increment time by 1 second because we already scraped data until "lastTimestamp"
    lastTimestamp++;
    d('last timestamp for measurement %s: %d', measurement, lastTimestamp);
    if (lastTimestamp < 10) {
      logger.warn(
        `${icons.warning} Initial scrape for ${shelly.getDeviceName()} - this could take a while...`
      );
    }
  } catch (error) {
    logger.error(`${icons.error} Error getting last timestamp from InfluxDB: ${error}`);
    return;
  }

  d(
    'fetching history since %s for device %s',
    new Date(lastTimestamp * 1000).toISOString(),
    shelly.getDeviceName()
  );

  let history: EMHistory = [];
  try {
    history = await shelly.getHistory(lastTimestamp);
  } catch (error) {
    logger.error(`${icons.error} Error fetching history from Shelly device ${shelly.getDeviceName()}: ${error}`);
    return;
  }

  if (history.length === 0) {
    d('no new data for device %s', shelly.getDeviceName());
    logger.warn(`${icons.warning} No new history-data from device ${shelly.getDeviceName()}`);
    return;
  }

  const points = shelly.toInfluxPoints(history);

  try {
    d(
      'writing %d points to influx for device %s (measurement: %s)',
      points.length,
      shelly.getDeviceName(),
      points[0].measurement
    );
    await services.influx.bulkWrite(points);
    logger.info(
      `${icons.success} Wrote ${points.length} points from ${shelly.getDeviceName()} to ${
        points[0].measurement
      } from ${new Date(history[0].timestamp * 1000).toISOString()} to ${new Date(
        history[history.length - 1].timestamp * 1000
      ).toISOString()}`
    );
  } catch (error) {
    logger.error(`${icons.error} Error writing to InfluxDB: ${error}`);
  }
}

/**
 * Continuous scraping loop for a single device
 */
async function deviceScrapeLoop(shelly: ShellyService): Promise<never> {
  while (true) {
    await scrapeDevice(shelly);
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        activeTimeouts.delete(timeout);
        resolve(undefined);
      }, config.scrapeInterval * 1000);
      activeTimeouts.add(timeout);
    });
  }
}

/**
 * Start independent scraping loops for all devices
 */
function startScraping(): void {
  d('starting scrape loops for %d devices', services.shelly.length);
  for (const shelly of services.shelly) {
    deviceScrapeLoop(shelly).catch((error) => {
      logger.error(`${icons.error} Device ${shelly.getDeviceName()} scrape loop failed: ${error}`);
    });
  }
}

/**
 * Graceful shutdown
 */
async function shutdown(): Promise<void> {
  d('initiating shutdown');
  logger.info(`${icons.info} Shutting down...`);

  // Clear all active timeouts
  for (const timeout of activeTimeouts) {
    clearTimeout(timeout);
  }
  activeTimeouts.clear();

  try {
    await services.influx.close();
    d('successfully closed all connections');
    logger.info(`${icons.success} Successfully closed all connections`);
    process.exit(0);
  } catch (error) {
    logger.error(`${icons.error} Error during shutdown: ${error}`);
    process.exit(1);
  }
}

// Set up signal handlers
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);


/**
 * Test all connections (InfluxDB and Shelly devices)
 */
async function testConnections(): Promise<boolean> {
  let allConnectionsSuccessful = true;
  
  // Test InfluxDB connection
  try {
    await services.influx.testConnection();
    logger.info(`${icons.success} InfluxDB connection successful`);
  } catch (error) {
    logger.error(`${icons.error} InfluxDB: ${(error as Error).message}`);
    allConnectionsSuccessful = false;
  }
  
  // Test Shelly device connections
  for (const shelly of services.shelly) {
    try {
      await shelly.testConnection();
      logger.info(`${icons.success} Shelly device ${shelly.getDeviceName()} connection successful`);
    } catch (error) {
      logger.error(`${icons.error} Shelly device ${shelly.getDeviceName()}: ${(error as Error).message}`);
      allConnectionsSuccessful = false;
    }
  }
  
  return allConnectionsSuccessful;
}

/**
 * Start the application after ensuring all connections are working
 */
async function startApplication(): Promise<void> {
  const connectionsPassed = await testConnections();
  
  if (!connectionsPassed) {
    logger.info(`${icons.info} Some connections failed, retrying in 10 seconds...`);
    
    // Retry until all connections pass
    const retryTimeout = setTimeout(async () => {
      activeTimeouts.delete(retryTimeout);
      await startApplication();
    }, 10_000);
    
    activeTimeouts.add(retryTimeout);
    return;
  }
  
  // All connections passed, start scraping
  logger.info(`${icons.info} All connections successful. Starting scrapers with interval of ${config.scrapeInterval} seconds`);
  startScraping();
}

// Start the application
startApplication();
