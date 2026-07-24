import http from 'node:http';
import { Client } from 'pg';

const port = Number(process.env.PORT || 3001);
const databaseUrl = process.env.DATABASE_URL;

async function startServer() {
  const client = databaseUrl ? new Client({ connectionString: databaseUrl }) : null;

  if (client) {
    try {
      await client.connect();
      await client.query('SELECT 1');
      console.log('Database connection OK');
    } catch (error) {
      console.error('Database connection failed', error);
    } finally {
      if (client) {
        await client.end().catch(() => undefined);
      }
    }
  }

  const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (requestUrl.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', database: Boolean(databaseUrl) }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'SMA Canoas Recicladores backend', status: 'running' }));
  });

  server.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
