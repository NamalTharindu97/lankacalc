# Production Backup And Restore Runbook

This runbook creates daily PostgreSQL custom-format backups, encrypts them before writing the final local artifact, uploads the encrypted artifact and checksum to off-server storage, and verifies restoration into a disposable database.

The tooling is prepared but is not operational until an off-server destination, encryption identity, systemd timer, failure alert, and successful restore exercise are recorded.

## Recovery Objectives

- Target RPO: 24 hours after the daily timer is activated.
- Target RTO: 4 hours for a database-only recovery after an operator is available.
- Local encrypted retention: 7 days by default.
- Remote encrypted retention: 35 days by default.
- Restore exercise: at least every 90 days and after PostgreSQL major-version or backup-tooling changes.

Release-time backups remain separate. `scripts/deploy-production.sh` creates a local pre-migration SQL dump for application release safety; it does not replace the daily off-server backup.

## Dependencies

Install and pin supported releases of:

- `age` for public-key encryption;
- `rclone` for the selected remote storage provider;
- Docker with the Compose plugin; and
- PostgreSQL 17 in the running database container.

The backup script writes no plaintext dump to the host. `pg_dump --format=custom` streams through `age` to a mode-`600` encrypted artifact under the backup directory.

## Encryption Identity

Generate the age identity on a trusted operator machine, not on the VPS:

```sh
age-keygen -o lankacalc-backup.agekey
age-keygen -y lankacalc-backup.agekey
```

Store at least two encrypted/restricted recovery copies of the identity in separate locations. The VPS needs only the public `age1...` recipient for routine backup. Install the private identity temporarily for a restore exercise, then remove it from the VPS after the exercise unless an approved key-management design requires otherwise.

Losing the identity makes every backup unrecoverable. Exposure of the identity requires generating a new identity, updating the recipient, and preserving the old identity securely until all backups encrypted to it expire.

## Configuration

Configure an rclone remote using provider credentials restricted to the dedicated backup destination. It must not have access to unrelated storage. Prefer provider-side object versioning or immutability when available.

Create `/etc/lankacalc/backup.env` owned by root with mode `600`:

```sh
BACKUP_AGE_RECIPIENT=age1replace_with_public_recipient
RCLONE_REMOTE=provider:lankacalc-production
LOCAL_RETENTION_DAYS=7
REMOTE_RETENTION_DAYS=35
```

For restore verification only, add the restricted identity path:

```sh
BACKUP_AGE_IDENTITY_FILE=/root/lankacalc-backup.agekey
```

Do not add storage secrets, rclone configuration, or age identities to the repository or production environment file. The `rclone` configuration must be readable only by the service account running the timer.

## Install And Activate

From the reviewed production checkout:

```sh
sudo install -m 0755 scripts/backup-production.sh /opt/lankacalc/repository/scripts/backup-production.sh
sudo install -m 0755 scripts/verify-backup-restore.sh /opt/lankacalc/repository/scripts/verify-backup-restore.sh
sudo install -m 0644 deploy/lankacalc-backup.service /etc/systemd/system/lankacalc-backup.service
sudo install -m 0644 deploy/lankacalc-backup.timer /etc/systemd/system/lankacalc-backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now lankacalc-backup.timer
sudo systemctl start lankacalc-backup.service
sudo systemctl status lankacalc-backup.service lankacalc-backup.timer
sudo systemctl list-timers lankacalc-backup.timer
```

The service runs as root because the existing production Docker deployment and restricted configuration are root-operated. Do not weaken environment, key, Docker-socket, or rclone-config permissions to run it as an unprivileged user without redesigning those boundaries.

Connect `lankacalc-backup.service` failure and timer silence to the production alert path. Alert when the newest successful remote object is older than 26 hours.

## Manual Backup

Run:

```sh
sudo ./scripts/backup-production.sh
```

A successful run:

1. starts or confirms PostgreSQL;
2. streams a custom-format dump directly through age encryption;
3. writes and uploads a SHA-256 sidecar;
4. asks rclone to compare the uploaded artifact;
5. removes expired matching local and remote backup objects; and
6. prints the uploaded object path without exposing credentials or data.

Only files named `lankacalc-*.dump.age` and their checksum sidecars are eligible for retention deletion.

## Restore Verification

Select a remote encrypted object and install the corresponding identity temporarily. Run:

```sh
sudo ./scripts/verify-backup-restore.sh \
  provider:lankacalc-production/lankacalc-<UTC timestamp>.dump.age
```

The verifier downloads the object and checksum into a mode-restricted temporary directory, checks integrity, decrypts into `pg_restore` without writing plaintext to disk, restores to a uniquely named temporary database, confirms public tables and queryability, and removes the temporary database even after most failures.

Record without user data:

- backup object and creation time;
- encrypted checksum;
- PostgreSQL version;
- exercise start/end times;
- success or failure and incident/action reference; and
- operator identity.

The check proves artifact integrity, decryption, and basic database restoration. Before an actual cutover, additionally verify migration state, critical aggregate row counts, immutable rule/source history, accounts, reminders, reports, and application compatibility. Do not print individual records during verification.

## Production Recovery

Do not restore over the production database in place.

1. Declare an incident and stop writes or isolate the affected application.
2. Preserve the damaged database volume and operational evidence.
3. Select the newest valid backup that predates corruption and verify its checksum.
4. Restore to a separate PostgreSQL 17 instance or volume.
5. Run migration, integrity, privacy, and application compatibility checks.
6. Document expected data loss against the RPO and obtain incident-owner approval.
7. Switch the application only after a tested cutover and rollback plan exists.
8. Run health, readiness, edge, private/launch, authentication, and affected worker checks.
9. Retain the old isolated data until incident review and legal/privacy requirements permit deletion.

Application image rollback does not restore PostgreSQL. A pre-migration release dump may be preferable for an immediately detected incompatible migration; the daily off-server backup is the disaster-recovery copy when the VPS or local backup directory is unavailable.

## Activation Checklist

- [ ] Age identity generated off-host with two recoverable protected copies.
- [ ] Public recipient installed; private identity absent from routine backup host.
- [ ] Dedicated least-privilege rclone remote configured and tested.
- [ ] Remote object encryption/versioning/immutability decision recorded.
- [ ] Root-owned mode-`600` backup and rclone configuration verified.
- [ ] Timer enabled and a manual run uploaded an encrypted object plus checksum.
- [ ] Backup failure and 26-hour freshness alerts delivered to primary and backup operators.
- [ ] Remote retention behavior reviewed against provider versioning and deletion semantics.
- [ ] Restore verifier passed using a downloaded remote object.
- [ ] Exercise evidence and next 90-day due date recorded.

Until every item is evidenced, off-server backup readiness remains prepared but not activated.
