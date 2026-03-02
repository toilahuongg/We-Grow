import webpush from "web-push";
import { env } from "@we-grow/env/server";
import { PushSubscription } from "@we-grow/db/models/index";

let initialized = false;

function initWebPush() {
  if (initialized) return;
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      env.BETTER_AUTH_URL,
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    );
    initialized = true;
  }
}

export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; url?: string },
) {
  initWebPush();
  if (!initialized) return;

  const subscriptions = await PushSubscription.find({ userId });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          JSON.stringify(payload),
        );
      } catch (error: unknown) {
        if (error && typeof error === "object" && "statusCode" in error && (error as { statusCode: number }).statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
        throw error;
      }
    }),
  );

  return results;
}
