const assert = require("node:assert/strict");
const { test } = require("node:test");
const createCorsOptions = require("./corsOptions");

const isAllowedOrigin = (options, origin) =>
  new Promise((resolve, reject) => {
    options.origin(origin, (error, allowed) => {
      if (error) reject(error);
      else resolve(Boolean(allowed));
    });
  });

test("allows the configured frontend and Flutter web origins", async () => {
  const options = createCorsOptions({
    frontendUrl: "https://sicpes.example.com/",
    mobileWebOrigins: "https://mobile.example.com, https://preview.example.com/path",
  });

  assert.equal(await isAllowedOrigin(options, "https://sicpes.example.com"), true);
  assert.equal(await isAllowedOrigin(options, "https://mobile.example.com"), true);
  assert.equal(await isAllowedOrigin(options, "https://preview.example.com"), true);
});

test("rejects origins that are not configured", async () => {
  const options = createCorsOptions({ frontendUrl: "https://sicpes.example.com" });

  assert.equal(await isAllowedOrigin(options, "http://localhost:5174"), false);
  assert.equal(await isAllowedOrigin(options, "http://127.0.0.1:8080"), false);
  assert.equal(await isAllowedOrigin(options, "https://localhost.attacker.com"), false);
  assert.equal(await isAllowedOrigin(options, "https://attacker.example"), false);
  assert.equal(await isAllowedOrigin(options, undefined), true);
});
