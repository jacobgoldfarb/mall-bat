import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';

const SELECTIONS = 'art/selections.json';

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data ? JSON.parse(data) : {}));
  });
}

function artReview(): Plugin {
  const jobs = new Map<string, string>();
  const run = (key: string, args: string[]) => {
    jobs.set(key, 'running');
    const child = spawn('bun', args, { stdio: 'inherit' });
    child.on('exit', (code) => jobs.set(key, code === 0 ? 'done' : 'failed'));
  };
  return {
    name: 'art-review',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__art', async (req, res) => {
        const send = (body: unknown) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };
        if (req.url === '/candidates') {
          const list: Record<string, string[]> = {};
          if (existsSync('art/raw'))
            for (const id of readdirSync('art/raw')) {
              if (!existsSync(`art/raw/${id}`) || id.includes('.log')) continue;
              list[id] = readdirSync(`art/raw/${id}`)
                .filter((f) => /^\d+(\.png)?$/.test(f))
                .sort((a, b) => parseInt(a) - parseInt(b));
            }
          return send(list);
        }
        if (req.url === '/selections' && req.method === 'GET') return send(existsSync(SELECTIONS) ? JSON.parse(readFileSync(SELECTIONS, 'utf8')) : {});
        if (req.url === '/selections' && req.method === 'POST') {
          writeFileSync(SELECTIONS, JSON.stringify(await readBody(req), null, 2));
          return send({ ok: true });
        }
        if (req.url === '/generate' && req.method === 'POST') {
          const { id, n } = await readBody(req);
          run(id, ['scripts/art/generate.ts', '--only', id, '--n', String(n ?? 2)]);
          return send({ ok: true });
        }
        if (req.url === '/build' && req.method === 'POST') {
          run('build', ['scripts/art/build.ts']);
          return send({ ok: true });
        }
        if (req.url === '/jobs') return send(Object.fromEntries(jobs));
        res.statusCode = 404;
        res.end();
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [preact(), artReview()],
  build: {
    outDir: 'dist',
    target: 'es2022',
    assetsInlineLimit: 0,
  },
});
