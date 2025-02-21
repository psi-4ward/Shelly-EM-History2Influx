# Shelly EM History 2 Influx

This add-on imports history data from Shelly EM devices into InfluxDB. 

* ⚡ Efficient data import by querying only new data since the last import
* 🔄 Support for InfluxDB v1.8 and v2.x
* 🗄 Prevent data gaps that can occur with live polling solutions like HomeAssistant, particularly during outages when Home Assistant is down or during network interruptions. The Shelly Pro 3EM devices store historical data for up to 60 days, allowing us to retrieve data even after extended outages.
* 💾 Long-term storage of energy data
* 📊 Analysis and visualization using Grafana
* 🔒 No cloud, no need to expose your devices to the internet


## Installation

### Add the add-on Repository

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fpsi-4ward%2FShelly-EM-History2Influx)


**Or manually:**
1. Open your Home Assistant web interface
2. Go to Settings > Add-ons
3. In the lower right corner click "Add-on Store"
4. At the top right, click the 3 dots and "Repositories"
5. Add `https://github.com/psi-4ward/Shelly-EM-History2Influx` and click "Add" followed by "Close"
6. Find the "Shelly EM History 2 Influx" add-on in the store

### Install the add-on

1. Find the "Shelly EM History 2 Influx" add-on in the `add-on store`. Try to refresh the page if its not there yet.
1. Click the `Install` button to install the add-on
2. Configure the add-on according to your needs
3. Start the `Shelly EM History 2 Influx` add-on
4. Check the logs of the `Shelly EM History 2 Influx` add-on ☝🏼


### Configuration

The add-on requires configuration for:
* InfluxDB connection (v1 or v2)
* One or more Shelly EM devices

For detailed configuration options and examples, please refer to the [Documentation page](https://github.com/psi-4ward/Shelly-EM-History2Influx/blob/main/hass-addon/DOCS.md).


## Support

Got questions or need help?
* Check the [documentation](https://github.com/psi-4ward/Shelly-EM-History2Influx#readme)
* Open an [issue](https://github.com/psi-4ward/Shelly-EM-History2Influx/issues) 

## License

This project is licensed under the BSD-2-Clause License. See the [LICENSE](https://github.com/psi-4ward/Shelly-EM-History2Influx/blob/main/LICENSE) file for details.

## Author

This project is developed by [Christoph Wiechert](https://github.com/psi-4ward).
