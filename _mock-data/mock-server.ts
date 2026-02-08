import { createMockServer } from '../src/test-utils/shelly-mock-server';

// Use PORT from env or default to 18080
const port = parseInt(process.env.PORT || '18080', 10);

// Start the mock server
const mockServer = await createMockServer(port);
console.log(`Mock server running at http://${mockServer.host}`);
console.log(`Available timestamps: ${mockServer.mockDataTstamps.join(', ')}`);

// Keep the process running
process.on('SIGINT', () => {
  console.log('Shutting down mock server...');
  mockServer.server.stop();
  process.exit(0);
});
