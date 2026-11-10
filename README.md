# NERDS Wildlife Logger — Task 1

Record which animal appeared in which camera stream and when. The React and
Express app runs in Docker on three workers, sharing one PostgreSQL database.
Traefik balances requests and serves HTTPS.

## Running deployment

- Application: https://192.168.50.1/
- Documentation: https://192.168.50.1/docs/
- Public source: https://github.com/metaCortex101/nerds-wildlife-proxmox
- Campus access uses the Proxmox host's existing uplink address over HTTPS.

HTTPS uses a dedicated lab CA. Import the supplied `nerds-lab-ca.crt` into
your trusted root store to remove the browser's certificate warning, or use
`curl --cacert nerds-lab-ca.crt`. Private keys stay on the load-balancer VM.

## Architecture

| Guest | Address | Role |
| --- | --- | --- |
| VM 103 | 10.10.10.103 | PostgreSQL 17, existing data volume retained |
| VM 104 | 10.10.10.104 | Traefik v3, HTTPS and active backend health checks |
| VM 107 | 10.10.10.107 | Worker 1, app Docker container |
| VM 108 | 10.10.10.108 | Worker 2, app Docker container |
| VM 109 | 10.10.10.109 | Worker 3, app Docker container |
| CT 100 | 10.10.10.2 | Dedicated documentation server |

Each worker is an independent full QEMU/KVM clone of VM 106 with 2 vCPUs,
3 GiB RAM, and a 32 GiB disk. Machine IDs, MAC addresses, and SSH host keys
are unique. The owner selected the Debian 13 base VM; the assignment's
Ubuntu 22.04 requirement remains a documented exception.

Traffic enters the existing Proxmox network, reaches Traefik on port 443, and
is proxied to worker port 8000. PostgreSQL is on a separate VM. Its application
login is restricted to the three worker addresses. There is no database on a worker.

## Application

Enter an animal, stream name, and local observation time. Saving converts
the time to UTC. The log shows every entry, newest first, in the viewer's local
timezone. Refresh updates the list; Print log produces a clean table.
The footer and `X-Worker-Name` response header identify the worker.

| Endpoint | Purpose |
| --- | --- |
| `GET /` | Browser application |
| `GET /health` | Database-aware readiness; 503 when PostgreSQL is unavailable |
| `GET /api/worker` | Worker identity |
| `GET /api/observations` | Shared observation log |
| `POST /api/observations` | Create an observation |

Example body:

```json
{"animal":"Red fox","stream":"Forest clearing cam","observed_at":"2026-11-10T12:00:00Z"}
```

## Build and run

1. Create a PostgreSQL database and non-superuser login. The app initializes
   its table if missing; the deployment initialized it before starting all workers.
2. Copy `.env.example` to `.env` on each worker. Set the database URL,
   worker identity, and bind address. Keep this file private.
3. Run `docker compose build`, then `docker compose up -d --wait`.
   This deployment builds once and loads the identical image on all workers.
4. On the load balancer, use `traefik/compose.yaml`, provide a certificate
   and key under `traefik/certs/`, then run `docker compose up -d --wait`.
5. For documentation, put the docs in `site/` beside
   `docs/nginx-compose.yaml` and start that Compose project.

The image builds the frontend with `npm ci` and runs as the unprivileged
`node` user. App containers have a read-only filesystem and temporary
`/tmp`. Docker and all services restart after boot.

## Verification

Checks cover verified HTTPS, valid and invalid observations, shared reads from
all workers, request distribution, worker failure/recovery, restart persistence,
and documentation access. The live docs include the resulting report.

See [operations](docs/OPERATIONS.md) for access, maintenance, backup, and testing.
This coursework application has no end-user authentication and is intended
for the configured lab network.
