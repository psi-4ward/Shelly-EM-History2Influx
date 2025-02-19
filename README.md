# Shelly EM History 2 InfluxDB

[![Code Quality](https://github.com/psi-4ward/Shelly-EM-History2Influx/actions/workflows/code-quality.yml/badge.svg)](https://github.com/psi-4ward/Shelly-EM-History2Influx/actions/workflows/code-quality.yml)

Import historical energy measurement data from Shelly EM devices into InfluxDB for long-term storage and analysis.


## Features

* ⚡ Efficient data import by querying only new data since the last import
* 🔄 Support for InfluxDB v1.8 and v2.x
* ⏱️ Configurable polling interval
* 🔌 Poll from multiple Shelly EM devices
* 🐳 Docker support
* 📝 Written in TypeScript using Bun runtime


### Why?

* 💾 Long-term storage of energy data
* 📊 Analysis and visualization using Grafana
* 🔍 Avoid data gaps that can occur with live polling solutions like HomeAssistant
* 🌐 Historical data remains available even if the Shelly device is temporarily unreachable
* 🔒 No cloud, no need to expose your devices to the internet

## Installation

### Using Docker (recommended)

You can either use docker-compose or pull the image directly from the GitHub Container Registry:

⚠️ **TODO**: Rework this!!!

```bash
# Using docker-compose
git clone https://github.com/psi-4ward/Shelly-EM-History2Influx.git
cd Shelly-EM-History2Influx
cp config/default.yaml config/development.yaml
docker-compose -f docker-compose.dev.yaml up -d

# Or using the pre-built image
docker pull ghcr.io/psi-4ward/shelly-em-history2influx:latest
# or a specific version
docker pull ghcr.io/psi-4ward/shelly-em-history2influx:v1.0.0
```

### Manual Installation

Requirements:
* [Bun](https://bun.sh) runtime

```bash
# Clone the repository
git clone https://github.com/psi-4ward/Shelly-EM-History2Influx.git
cd Shelly-EM-History2Influx

# Install dependencies
bun install

# Copy and adjust the configuration
cp config/default.yaml config/development.yaml

# Start the application
bun start
```

## Configuration

The configuration is done through YAML files in the `config` directory.  
Adjust [`default.yaml`](./config/default.yaml) to your needs.  

You can also create a overwrite-file for your specific environment, e.g. `config/production.yaml`.
The environment will be parsed from the `NODE_ENV` environment variable.


## Development

```bash
# Run tests
bun test

# Run with development config
bun run dev

# Build the application
bun run build
```

## License

BSD-2-Clause

## Author

Christoph Wiechert
