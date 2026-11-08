const { defineConfig, devices } = require("@playwright/test");
const port = Number(process.env.PLAYWRIGHT_PORT || 8765);
module.exports = defineConfig({
  testDir: "tests",
  testMatch: ["browser.spec.cjs", "academy.spec.cjs", "roentgen.spec.cjs", "anatomy.spec.cjs"],
  fullyParallel: true,
  timeout: 30000,
  use: { baseURL: "http://127.0.0.1:" + port, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "PORT=" + port + " HOST=127.0.0.1 python3 server.py",
    url: "http://127.0.0.1:" + port,
    reuseExistingServer: false,
  },
});
