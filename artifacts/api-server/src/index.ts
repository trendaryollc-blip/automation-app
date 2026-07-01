const rawPort = process.env["PORT"];
const host = process.env["HOST"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function startServer() {
  // Load logger first so we can use it for startup diagnostics.
  const { logger } = await import("./lib/logger");
  const { validateProductionEnv } = await import("./lib/env");

  // Refuse to boot in production with unsafe configuration.
  const envReport = validateProductionEnv();
  if (!envReport.ok) {
    for (const e of envReport.errors) logger.fatal({ err: e }, "Env validation failed");
    throw new Error(
      "Refusing to start: production environment is misconfigured. " +
        "Fix the errors above and re-deploy.\n" +
        envReport.errors.map((e) => `  - ${e}`).join("\n"),
    );
  }
  for (const w of envReport.warnings) {
    logger.warn({ warning: w }, "Env warning");
  }

  const { default: app } = await import("./app");

  const listenCallback = (err: unknown) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port, host }, "Server listening");
  };

  if (host) {
    app.listen(port, host, listenCallback);
  } else {
    app.listen(port, listenCallback);
  }
}

await startServer();

export { startServer };
