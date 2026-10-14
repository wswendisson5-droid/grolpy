# Connection flow repair — 13 October 2026

The client status endpoint previously omitted QR/pairing updates. The client initialization effect reran when method callbacks changed, and QR retries used unmanaged timeouts. The pairing route could accept a previous cached code. These changes propagate challenge metadata, preserve timestamps for duplicate payloads, serialize generation per tenant in each app worker, cancel browser requests after 35 seconds, clear challenges on method changes, and stop automatic attempts after bounded retries. Both views show a renewal countdown and retain manual generation.

The 40-second countdown is a conservative renewal window, not WhatsApp's guaranteed expiry. Evolution 2.3.7 configures `qrTimeout: 45_000` and requests a new pairing code on QR events. The same QR/pairing payload must never restart that countdown. Renewals pause while the page is hidden. A connection is shown as confirmed only after a status check reports it connected.

## Evolution prerequisite

In the official 2.3.7 controller, a connecting instance returns `instance.qrCode` without using the newly requested phone number. The pairing upgrade extends the existing session-v1 restart to accept a number, clears only the transient QR counter/payload, and invokes that restart when the requested number differs while the instance is connecting. Already open sessions take the existing early return. No auth files, instances, tenants or database volumes are deleted.

Build from `ops` with `docker build -f Dockerfile.evolution -t groply-evolution:2.3.7-session-v2 .`. The additional patch can also upgrade a session-v1 bundle with `node patch-evolution-pairing.cjs /evolution/dist/main.js`, followed by `node --check /evolution/dist/main.js`. Unknown anchors reject the upgrade before writing. Keep the generated `.groply-pairing-backup` for rollback. Inspect the actual deployed bundle and compose configuration before replacing the image; restarting the Evolution service can temporarily interrupt active sessions.

Official source examined:
- https://github.com/EvolutionAPI/evolution-api/blob/2.3.7/src/api/controllers/instance.controller.ts
- https://github.com/EvolutionAPI/evolution-api/blob/2.3.7/src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts

## Validation and remaining production check

Run `node --import tsx test-connection-challenge.ts`, `npm run lint` and `npm run build`. The regression test covers pairing format, duplicate timestamps, challenge rotation, patch idempotence and rejection of unknown builds, method switching without repeatedly restarting the same phone, and preserving open sessions. The patch was additionally matched against an independently minified official 2.3.7 controller, not the deployed image.

A temporary DOM simulation exercised the real client component with mocked API responses: first QR display, countdown continuity, automatic renewal, switching methods, pairing display, generation failure/retry, connected-state confirmation, and timer cleanup. This is not a real phone authentication test or visual browser validation.

SSH execution through the connected Windows computer exited with code 255 and returned no diagnostic output. Production is not changed or certified. Complete the review by checking the running Evolution bundle, publishing both changes, then testing a dedicated account: first QR, renewal without clicks, QR-to-number switching, wrong number, a second attempt after refusal, confirmed connection, and disconnection from the phone. In-memory locks/caches remain worker-local; a multi-worker deployment needs shared challenge coordination.
