# Shelly EM History 2 Influx

## Home Assistant Add-on Configuration

You can use the `Configuration` tab of the add-on page to configure the app.

* **shelly**: Configure the Shelly EM devices to scrape. The schema is the same as the sub-section described in [config/default.yaml](https://github.com/psi-4ward/Shelly-EM-History2Influx/blob/main/config/default.yaml).  
  ⚠️ To define the `tags` you need to use key-value pairs separated by commas, e.g. `device_name=shelly_em_1,location=basement`.

* **influx**: Configure the InfluxDB connection. The schema is the same as the sub-section described in [config/default.yaml](https://github.com/psi-4ward/Shelly-EM-History2Influx/blob/main/config/default.yaml).

* **scrapeInterval**: The interval in seconds between scrapes.