# Provider Isolation Test DApp

A dependency-free third-party QA fixture for imToken DApp WebView acceptance.

It verifies, without reading or displaying private values:

- `window.ethereum.request` is available;
- `eth_requestAccounts` succeeds;
- `personal_sign` succeeds;
- `window.imTokenAgent` is not an own property;
- `window.imToken.agent` is not an own property;
- `window.imToken.deviceToken` is not an own property.

The page performs no analytics, storage, or result upload. Use only a dedicated
no-funds QA wallet.

## Local verification

```sh
npm test
python3 -m http.server 4173
```

Open <http://127.0.0.1:4173/>. A normal desktop browser should show that no
Provider is available and all private fields are absent. Provider acceptance
must be performed inside the target imToken build on real devices.
