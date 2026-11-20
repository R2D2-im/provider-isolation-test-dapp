import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildSignMessage,
  inspectEnvironment,
  owns,
  utf8ToHex,
} from "./app.js";

assert.equal(owns({}, "deviceToken"), false);
assert.equal(owns({ deviceToken: undefined }, "deviceToken"), true);

assert.deepEqual(
  inspectEnvironment({ ethereum: { request() {} }, imToken: {} }),
  {
    providerPresent: true,
    imTokenAgentPresent: false,
    nestedAgentPresent: false,
    deviceTokenPresent: false,
  },
);

assert.deepEqual(
  inspectEnvironment({
    imTokenAgent: undefined,
    imToken: { agent: undefined, deviceToken: undefined },
  }),
  {
    providerPresent: false,
    imTokenAgentPresent: true,
    nestedAgentPresent: true,
    deviceTokenPresent: true,
  },
);

assert.equal(utf8ToHex("imToken"), "0x696d546f6b656e");
assert.match(
  buildSignMessage("https://example.test"),
  /https:\/\/example\.test/,
);

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
for (const id of [
  "provider-present",
  "agent-absent",
  "nested-agent-absent",
  "device-token-absent",
  "connect",
  "sign",
  "connect-result",
  "sign-result",
  "overall-result",
]) {
  assert.match(html, new RegExp(`id=["']${id}["']`));
}

console.log("Static helper tests passed");
