import http from 'http';
import app from './app';
import { config } from './config';
import { initSocket } from './socket';
import { startBackgroundJobWorker } from './services/background.service';

const server = http.createServer(app);

// Initialize WebSockets
initSocket(server);

// Start Background Job Worker (every 5 seconds)
startBackgroundJobWorker(5000);

server.listen(config.port, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Ticket Booking Backend Server Running`);
  console.log(`📡 URL: http://localhost:${config.port}`);
  console.log(`⚡ Environment: ${config.nodeEnv}`);
  console.log(`==================================================\n`);
});
