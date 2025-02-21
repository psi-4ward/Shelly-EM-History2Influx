/**
 * Configuration loader that reads from YAML files based on NODE_ENV
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { InfluxConfig } from './lib/InfluxService';
import type { ShellyConfig } from './lib/ShellyService';

export interface Config {
  shelly: ShellyConfig[];
  influx: InfluxConfig;
  scrapeInterval: number; // Interval in seconds between scrapes
}

const NODE_ENV = process.env.NODE_ENV || 'development';

// Icons for console output
const icons = {
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
  config: '⚙️',
  valid: '✅',
} as const;

/**
 * Log error and exit process
 */
function exitWithError(message: string): never {
  console.error(`\n${icons.error} Configuration Error: ${message}`);
  process.exit(1);
}

/**
 * Load and parse a YAML configuration file
 */
function loadYamlConfig(path: string): Partial<Config> {
  try {
    if (!existsSync(path)) {
      return {};
    }
    const configFile = readFileSync(path, 'utf8');
    return parse(configFile) as Partial<Config>;
  } catch (error) {
    exitWithError(
      `Failed to load config from ${path}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Validate Shelly configuration
 */
function validateShellyConfig(configs: ShellyConfig[]): void {
  if (!Array.isArray(configs) || configs.length === 0) {
    exitWithError('At least one Shelly device configuration is required');
  }

  configs.forEach((config, index) => {
    if (!config.host) {
      exitWithError(`Shelly host is required for device at index ${index}`);
    }

    // If password is set, username must also be set
    if (config.password && !config.username) {
      exitWithError(
        `Shelly username is required when password is set for device at index ${index}`
      );
    }

    // Validate tags
    if (!config.tags) {
      config.tags = {};
    } else {
      // Convert string tags to object
      if (typeof config.tags === 'string') {
        const tagsStr = config.tags as string;
        config.tags = {};

        for (const pair of tagsStr.split(',')) {
          const [key, value] = pair.split('=');
          if (key && value) {
            config.tags[key.trim()] = value.trim();
          }
        }
      }
    }
  });
}

/**
 * Validate InfluxDB configuration
 */
function validateInfluxConfig(config: InfluxConfig): void {
  if ('version' in config) {
    if (config.version === 1) {
      if (!config.host) exitWithError('InfluxDB v1 host is required');
      if (!config.database) exitWithError('InfluxDB v1 database is required');

      // Optional auth
      if (config.username && !config.password) {
        exitWithError('InfluxDB v1 password is required when username is set');
      }
      if (config.password && !config.username) {
        exitWithError('InfluxDB v1 username is required when password is set');
      }
    } else if (config.version === 2) {
      if (!config.url) exitWithError('InfluxDB v2 url is required');
      if (!config.token) exitWithError('InfluxDB v2 token is required');
      if (!config.org) exitWithError('InfluxDB v2 org is required');
      if (!config.bucket) exitWithError('InfluxDB v2 bucket is required');

      try {
        new URL(config.url);
      } catch {
        exitWithError('InfluxDB v2 url is invalid');
      }
    } else {
      // @ts-expect-error - type is never here but we want to print runtime value
      exitWithError(`Invalid InfluxDB version: ${config.version}`);
    }
  } else {
    exitWithError('InfluxDB version is required');
  }
}

/**
 * Validate the complete configuration
 */
function validateConfig(config: Config): void {
  validateShellyConfig(config.shelly);
  validateInfluxConfig(config.influx);

  // Validate scrapeInterval
  if (!config.scrapeInterval || config.scrapeInterval < 60) {
    exitWithError('scrapeInterval must be at least 60 seconds');
  }

  console.log(`${icons.valid} Configuration is valid`);
}

/**
 * Load a configuration file
 */
function loadConfig(configPath: string): Partial<Config> {
  try {
    if (existsSync(configPath)) {
      const config = loadYamlConfig(configPath);
      
      console.log(`${icons.info} Loaded configuration from: ${configPath}`);
      return config;
    }
  } catch (error) {
    console.error(
      `${icons.warning} Failed to load configuration from ${configPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  return {};
}

// Cache the config
let config: Config;

/**
 * Initialize the application configuration
 */
export function getConfig(): Config {
  if (config) {
    return config;
  }

  const configDir = join(process.cwd(), 'config');

  // Load configs
  const defaultConfig = loadConfig(join(configDir, 'default.yaml'));
  const envConfig = loadConfig(join(configDir, `${NODE_ENV}.yaml`));

  // Merge configurations with environment overriding default
  const mergedConfig = {
    ...defaultConfig,
    ...envConfig,
  } as Config;

  // Validate the merged configuration
  validateConfig(mergedConfig);

  config = mergedConfig;
  return mergedConfig;
}
