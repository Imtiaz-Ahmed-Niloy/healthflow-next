/**
 * pm2 process definition — the one place the production port lives.
 *
 * `next start` reads PORT from the environment (its CLI option is declared
 * `.default(3000).env('PORT')`), so setting it here is enough; nothing needs a
 * `-p` flag. Change the number below and the next deploy picks it up, because
 * the workflow restarts with --update-env.
 *
 * Note this must agree with whatever nginx proxies to. It is deliberately not
 * a GitHub secret: the port is not sensitive, and keeping it in the repo means
 * the value is reviewable and travels with the code that serves on it.
 */
module.exports = {
  apps: [
    {
      // Must match the process already running on the droplet, or
      // startOrRestart starts a second one on the same port.
      name: "healthflowbd",
      script: "yarn",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },
      // A crash loop should stop, not hammer the box forever.
      max_restarts: 10,
      min_uptime: "20s",
    },
  ],
};
