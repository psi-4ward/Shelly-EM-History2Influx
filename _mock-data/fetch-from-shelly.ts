/**
 * @fileoverview Fetch some mock data from Shelly EM device and save it to a files
 */

type EMDataResponse = {
  keys?: string[];
  data: {
    ts: number;
    period: string;
    values: number[][];
  }[];
  next_record_ts?: number;
};

const args = process.argv.slice(2);
if (args.length < 4) {
  console.error('⛔ Usage: bun run fetch-from-shelly.ts <host> <user> <pass> <from_ts>');
  process.exit(1);
}

const [host, user, pass, from_ts] = args;
const fromTimestamp = parseInt(from_ts, 10);

if (Number.isNaN(fromTimestamp)) {
  console.error('⛔ from_ts must be a valid unix timestamp');
  process.exit(1);
}

// Create auth header if credentials are provided
const headers: Record<string, string> = {
  Accept: 'application/json',
};
if (user && pass) {
  const auth = Buffer.from(`${user}:${pass}`).toString('base64');
  headers.Authorization = `Basic ${auth}`;
}

const baseUrl = `http://${host}`;

// Test connection
console.log('🔌 Testing connection to Shelly device...');
try {
  const testResponse = await fetch(`${baseUrl}/rpc/Shelly.GetStatus`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: 1,
      method: 'Shelly.GetStatus',
    }),
  });
  if (!testResponse.ok) {
    console.error('❌ Failed to connect to Shelly device');
    process.exit(1);
  }
  console.log('✅ Connection successful!');
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error('❌ Failed to connect to Shelly device:', error.message);
  } else {
    console.error('❌ Failed to connect to Shelly device');
  }
  process.exit(1);
}

// Fetch history data
console.log(`⚡ Fetching energy history data starting at timestamp ${fromTimestamp}...`);
let nextTs: number | null = fromTimestamp;

while (nextTs !== null) {
  console.log(`📥 Fetching data chunk from timestamp ${nextTs}...`);
  const response = await fetch(`${baseUrl}/rpc/EMData.GetData?id=0&ts=${nextTs}`, {
    headers,
  });

  if (!response.ok) {
    console.error(`❌ Failed to fetch history: ${response.status} ${response.statusText}`);
    console.error(await response.text());
    process.exit(1);
  }

  const data = (await response.json()) as EMDataResponse;

  // Write data to file
  const filename = `EMData/${nextTs}.json`;
  await Bun.write(filename, JSON.stringify(data, null, 2));
  console.log(`💾 Saved data to ${filename}`);

  // Check if there's more data to fetch
  nextTs = data.next_record_ts && data.next_record_ts > 0 ? data.next_record_ts : null;
}

console.log('✨ Data fetching completed successfully!');
