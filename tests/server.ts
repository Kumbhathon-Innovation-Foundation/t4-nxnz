/// <reference types="next" />

export {};

import { createServer } from "http";

async function boot() {
  const next = (await import("next")).default;
  const port = Number(process.env.PORT ?? 3111);
  const app = next({ dev: false, dir: process.cwd() });
  await app.prepare();
  const handle = app.getRequestHandler();
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`[test-server] ready on ${port}`);
  });
}

boot().catch((e) => {
  console.error(e);
  process.exit(1);
});
