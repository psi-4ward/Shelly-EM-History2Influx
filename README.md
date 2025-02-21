# Shelly EM History 2 InfluxDB

[![latest release](https://img.shields.io/github/v/release/psi-4ward/Shelly-EM-History2Influx)](https://github.com/psi-4ward/Shelly-EM-History2Influx/releases/latest)
[![CI](https://github.com/psi-4ward/Shelly-EM-History2Influx/actions/workflows/test-and-build.yml/badge.svg)](https://github.com/psi-4ward/Shelly-EM-History2Influx/actions/workflows/test-and-build.yml)
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=RTWDCH74TJN54&item_name=shelly2influx)

Import historical energy measurement data from Shelly EM devices into InfluxDB for long-term storage and analysis.

⚠️ **Please Note**: This software is currently in alpha state and in a testing phase. While it's functional (and works for me 🤓), you may encounter bugs or breaking changes. Use with caution in production environments. If you encounter any issues or bugs, please report them in our [issue tracker](https://github.com/psi-4ward/Shelly-EM-History2Influx/issues).



## Features

* ⚡ Efficient data import by querying only new data since the last import
* 🔄 Support for InfluxDB v1.8 and v2.x
* ⏱️ Configurable polling interval
* 🔌 Poll from multiple Shelly EM devices
* 🐳 Docker support
* 📝 Written in TypeScript using Bun runtime
* 🏠 Available as [Home Assistant Addon](https://github.com/psi-4ward/Shelly-EM-History2Influx/tree/hass-addon/hass-addon)


### Why?

* 🗄 Prevent data gaps that can occur with live polling solutions like HomeAssistant, particularly during outages when Home Assistant is down or during network interruptions. The Shelly Pro 3EM devices store historical data for up to 60 days, allowing us to retrieve data even after extended outages.
* 💾 Long-term storage of energy data
* 📊 Analysis and visualization using Grafana
* 🔒 No cloud, no need to expose your devices to the internet


## Installation

### Home Assistant Addon

Shelly EM History 2 Influx is available as a Home Assistant Addon.  
See the [Addon-Repository](https://github.com/psi-4ward/Shelly-EM-History2Influx/tree/hass-addon/hass-addon) for more information.

### Using Docker (recommended)

You can either use docker-compose or pull the image directly from the GitHub Container Registry.

1. Create a `config` directory and adjust the [`default.yaml`](./config/default.yaml) to your needs.
2. Run the container:
   ```shell
   docker run --rm -v $(pwd)/config:/app/config ghcr.io/psi-4ward/shelly-em-history2influx:latest
   ```

### Manual using Bun 

Requirements:
* [Bun](https://bun.sh) runtime

```bash
# Clone the repository
git clone https://github.com/psi-4ward/Shelly-EM-History2Influx.git
cd Shelly-EM-History2Influx

# Install dependencies
bun install --production --frozen-lockfile

# Adjust the configuration
vim config/default.yaml

# Start the application
bun start
```

## Configuration

The configuration is done through YAML files in the `config` directory.  
Adjust [`default.yaml`](./config/default.yaml) to your needs.  

You can also create a overwrite-file for your specific environment, e.g. `config/production.yaml`.
The environment will be parsed from the `NODE_ENV` environment variable.


## License

BSD-2-Clause

## Author

Christoph Wiechert
