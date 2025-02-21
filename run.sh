#!/bin/sh
set -e

# Check if /data/options.json exists (running as Home Assistant add-on)
if [ -f /data/options.json ]; then
  echo Converting Home Assistant /data/options.json to config/default.yaml
  yq eval -P /data/options.json > /app/config/default.yaml
fi

# Make sure we can read the config file
chown -R bun /app/config

# Run the app as non-root user and replace the current shell with the bun process
exec su bun -s /bin/sh -c 'exec bun run src'