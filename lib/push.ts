// Web Push configuration
// Uses VAPID keys from environment variables

export interface PushPayload {
  title: string;
  body: string;
  link?: string;
}

export async function sendPushNotification(
  subscription: { endpoint: string; keys: { auth: string; p256dh: string } },
  payload: PushPayload
): Promise<void> {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:admin@daylog.app";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("[PUSH] VAPID keys not configured");
    return;
  }

  try {
    // Dynamic import to avoid issues in environments without web-push
    const webpush = await import("web-push");
    webpush.default.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    await webpush.default.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    console.error("[PUSH] Failed to send notification:", error);
    throw error;
  }
}
