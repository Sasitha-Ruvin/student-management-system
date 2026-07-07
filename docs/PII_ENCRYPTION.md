# PII encryption (partial)

Sensitive student fields are encrypted at rest with **AES-256-GCM**. Identity and operational fields stay in plaintext for admin search and display.

## Encrypted fields

| Field | DB column |
|-------|-----------|
| NIC | `nicEnc` + `nicHash` (unique, exact lookup) |
| Date of birth | `dobEnc` |
| Address | `addressEnc` |
| Contact number | `contactNumberEnc` |
| WhatsApp | `whatsappNumberEnc` |
| Height / weight | `heightEnc`, `weightEnc` (optional) |

NIC partial search uses `student_nic_search_tokens` (HMAC trigrams). Name search uses plaintext `fullName` plus optional `student_name_search_tokens`.

## Plaintext fields

| Field | DB column |
|-------|-----------|
| Full name | `fullName` |
| Email | `email` (unique) |
| Gender | `gender` |
| Login note, branch prefs, FCM | `loginDisabledNote`, `preferredBranchRaw`, `preferredDate`, `fcmToken` |

In Supabase Table Editor, `students.fullName` and `students.email` are readable; `nicEnc`, `dobEnc`, etc. hold `v1:...` ciphertext.

## Environment

Same keys on admin portal, student portal, and Supabase Edge (`student-register`):

- `DATA_ENCRYPTION_KEY` — 32-byte value, base64-encoded
- `SEARCH_HMAC_KEY` — 32-byte value, base64-encoded (NIC hash + search tokens)

## Payments / enrollments / webhooks

Payment `reference`, `notes`, and `voidReason` are stored in plaintext with optional `*Enc` duplicates for migration compatibility. Enrollment `notes` is plaintext + optional `notesEnc`. Webhook logs store `payload` (JSON) and optional `payloadEnc`.

## Migrations

1. `20260521220019_secureity_encryptions` — adds `*Enc` columns
2. `20260521240000_student_partial_pii` — restores plaintext name/email; drops identity `*Enc` columns

Empty database: run `npx prisma migrate deploy` from `admin-portal`. No backfill required.
