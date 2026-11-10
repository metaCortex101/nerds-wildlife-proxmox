# Operations

## Access

From PowerShell, using the existing workstation key:

```powershell
ssh -i "$HOME\.ssh\tu" -J root@192.168.50.1 root@10.10.10.107
```

From Proxmox:

```sh
ssh -i /root/.ssh/nerds-workers root@10.10.10.107
```

The management key also works for VMs 103, 104, 108, and 109.

| Service | Host | Compose directory |
| --- | --- | --- |
| Application | VMs 107–109 | `/opt/nerds/app` |
| PostgreSQL | VM 103 | `/home/debian/docker/postgres` |
| Traefik | VM 104 | `/home/debian/docker/traefik` |
| Documentation | CT 100 | `/opt/nerds-docs` |

Run `docker compose ps` or `docker compose logs --tail 100` in that
directory. Use `pct enter 100` for documentation and SSH for worker VMs.

## Verify and demonstrate failover

```sh
curl --cacert nerds-lab-ca.crt https://192.168.50.1/health
curl --cacert nerds-lab-ca.crt https://192.168.50.1/api/observations
curl --cacert nerds-lab-ca.crt https://192.168.50.1/docs/
```

Repeat requests to `/api/worker` to observe all three identities.
Stop `wildlife` on one worker, wait at least one Traefik health-check
interval, and repeat requests. Restore it with `docker compose up -d --wait`.
The observations remain in PostgreSQL throughout.

## Backups and secrets

PostgreSQL uses its original external Docker volume. Do not delete that volume
or use `docker compose down -v`. On VM 103:

```sh
docker compose exec -T database sh -c 'pg_dump -U "$POSTGRES_USER" nerds_wildlife' > wildlife.sql
```

Keep dumps private. Runtime `.env` files have mode 0600. The generated app
password is also in `/root/nerds-task-secrets.json` on Proxmox; it is
excluded from the public source. Snapshots of VMs 103 and 104 were taken
before changes; names are in `/root/nerds-task-before/snapshots.json`.
Original service configs also have `.before-nerds-task` backups.

## HTTPS and networking

Existing bridges, addressing, DHCP, Wi-Fi, routing, and port 80/8080 forwarding
remain in place. `nerds-https-forward.service` adds only port 443 DNAT and
forwarding to Traefik on the existing access-point and uplink interfaces.
It preserves other firewall rules and starts after boot.

The certificate covers the access-point, load-balancer, and current campus
uplink IPs, plus `nerds.local`. If the uplink IP changes, regenerate the
leaf certificate with the same lab CA. Campus inbound policy is outside this
deployment. This is a lab CA, not a publicly issued Internet certificate.

## Assignment checklist

- Observation entry and onscreen log: implemented.
- Three equal worker VMs: full clones of VM 106.
- Ubuntu no newer than 22.04: documented owner-selected Debian exception.
- Public GitHub source: clean history without credentials or dependency folders.
- Local Docker on every worker: one identical application image.
- Traefik VM, HTTPS, dedicated database, and documentation server: implemented.
