# Web/Hosted License Mode — SDD Progress

Base commit: 88ddfd8 (plan commit)
Branch: feat/web-hosted-license
Plan: docs/superpowers/plans/2026-07-06-web-hosted-license.md

## Tasks
- Task 1: complete (commits 88ddfd8..a842f55, review clean, no findings)
- Task 2: complete (commits a842f55..513f155, review clean, no findings)
- Task 3: complete (commits 513f155..7d220be, review clean; live issuance deferred — needs keypair+DB)

## Final whole-branch review (opus): "Ready to merge" — no Critical/Important.
- Note (document in ops runbook): hosted token = machine-unbound BEARER credential; no per-seat enforcement for hosted; revocation is the only kill switch → treat LICENSE_KEY as a secret.
- Note: stray/invalid LICENSE_KEY env on a desktop shadows license.dat (operational trap, not a security bypass — invalid key licenses nothing).
- Manual pre-prod: mint via `license:new --web`, paste to LICENSE_KEY, confirm active on a different-fingerprint host; revoke → locks; desktop-without-env regression still reads license.dat.

## Minor findings (for final review)
