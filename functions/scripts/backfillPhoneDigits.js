/**
 * One-time migration script:
 * Backfill users.phoneDigits from users.phone for phone-based login.
 *
 * Run:
 *   cd functions
 *   node scripts/backfillPhoneDigits.js
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function normalizeToUs10Digits(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  if (digits.length >= 10) return digits.slice(-10);
  return null;
}

async function run() {
  console.log('Starting phoneDigits backfill...');
  const snap = await db.collection('users').get();

  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  let invalid = 0;

  let batch = db.batch();
  let ops = 0;

  for (const doc of snap.docs) {
    scanned += 1;
    const data = doc.data() || {};
    const current = data.phoneDigits || null;
    const derived = normalizeToUs10Digits(data.phone);

    if (!derived) {
      invalid += 1;
      continue;
    }

    if (current === derived) {
      skipped += 1;
      continue;
    }

    batch.update(doc.ref, {
      phoneDigits: derived,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    updated += 1;
    ops += 1;

    if (ops >= 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
  }

  console.log('Backfill complete.');
  console.log(JSON.stringify({ scanned, updated, skipped, invalid }, null, 2));
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});

