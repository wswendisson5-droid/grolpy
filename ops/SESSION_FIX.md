Production repair — 7 October 2026

The Evolution 2.3.7 session reported open while group and media calls returned Connection Closed. Its connection events were processed behind history/database work; restart did not reliably recreate the socket. The pinned image built with Dockerfile.evolution prioritizes connection events, ignores obsolete socket callbacks, and adds a real per-instance restart. `skipPicture=true` avoids one avatar request per group during synchronization.

Build from this directory: `docker build -f Dockerfile.evolution -t groply-evolution:2.3.7-session-v1 .`

On the Evolution host, `/opt/evolution-api/docker-compose.yml` uses that image. Its PostgreSQL service now has `shm_size: 256m`. PostgreSQL `max_parallel_workers_per_gather=0` is persisted through ALTER SYSTEM: concurrent history counts had exhausted the previous 64 MB shared-memory mount. Session storage and database volumes are preserved. The prior compose file is backed up as `docker-compose.yml.before-groply-session` on that host.

On Kangaroo, the account crontab wakes `/api/health` every minute (`groply-scheduler-keepalive`) so Passenger does not stop recurring scheduling when no browser is open.

Verified: real group queries returned 100 records / 88 memberships / 63 open eligible groups; per-instance restart returned open and the next query succeeded. Application tests cover all seven weekdays, multiple daily slots, future start dates, and once-only future scheduling. Immediate sends remain in “enviando” until real progress arrives. These tests do not certify future WhatsApp delivery or retroactively turn previous failures into successful sends.
