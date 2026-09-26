import webpush from "web-push";
import { getSql } from "@/lib/db";

const SUBJECT = "mailto:app@localhost";

type Keys = { publicKey: string; privateKey: string };

async function keys(): Promise<Keys> {
  const sql = await getSql();
  const rows = await sql<{ public_key: string; private_key: string }>`
    select public_key, private_key from push_config where id = 1
  `;
  if (rows[0]) return { publicKey: rows[0].public_key, privateKey: rows[0].private_key };
  const generated = webpush.generateVAPIDKeys();
  await sql`
    insert into push_config (id, public_key, private_key)
    values (1, ${generated.publicKey}, ${generated.privateKey})
    on conflict (id) do nothing
  `;
  const again = await sql<{ public_key: string; private_key: string }>`
    select public_key, private_key from push_config where id = 1
  `;
  const row = again[0];
  if (!row) throw new Error("push keys missing");
  return { publicKey: row.public_key, privateKey: row.private_key };
}

export async function vapidPublicKey() {
  return (await keys()).publicKey;
}

export async function saveSubscription(userId: string, endpoint: string, p256dh: string, authKey: string) {
  const sql = await getSql();
  await sql`
    insert into push_subscriptions (endpoint, user_id, p256dh, auth_key)
    values (${endpoint}, ${userId}, ${p256dh}, ${authKey})
    on conflict (endpoint) do update
      set user_id = ${userId}, p256dh = ${p256dh}, auth_key = ${authKey}
  `;
}

export async function removeSubscription(userId: string, endpoint: string) {
  const sql = await getSql();
  await sql`
    delete from push_subscriptions where user_id = ${userId} and endpoint = ${endpoint}
  `;
}

export async function deliver(userId: string, title: string, body: string) {
  const pair = await keys();
  webpush.setVapidDetails(SUBJECT, pair.publicKey, pair.privateKey);
  const sql = await getSql();
  const rows = await sql<{ endpoint: string; p256dh: string; auth_key: string }>`
    select endpoint, p256dh, auth_key from push_subscriptions where user_id = ${userId}
  `;
  let sent = 0;
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth_key } },
        JSON.stringify({ title, body }),
      );
      sent += 1;
    } catch (err) {
      const status = typeof err === "object" && err && "statusCode" in err ? Number(err.statusCode) : 0;
      if (status === 404 || status === 410) {
        await sql`delete from push_subscriptions where endpoint = ${row.endpoint}`;
      }
    }
  }
  return { sent };
}
