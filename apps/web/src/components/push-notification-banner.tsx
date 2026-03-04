"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { orpc, client } from "@/utils/orpc";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PushStatus = "loading" | "unsupported" | "denied" | "subscribed" | "not-subscribed" | "dismissed";

const DISMISS_KEY = "push-banner-dismissed";

export function PushNotificationBanner() {
  const t = useTranslations("pushBanner");
  const [status, setStatus] = useState<PushStatus>("loading");
  const [subscribing, setSubscribing] = useState(false);

  const { data: vapidData } = useQuery({
    ...orpc.notifications.getVapidPublicKey.queryOptions(),
    staleTime: Infinity,
    enabled: status === "not-subscribed",
  });

  useEffect(() => {
    async function check() {
      if (sessionStorage.getItem(DISMISS_KEY)) {
        setStatus("dismissed");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      if (Notification.permission === "granted") {
        try {
          const reg = await navigator.serviceWorker.getRegistration("/sw.js");
          if (reg) {
            const sub = await reg.pushManager.getSubscription();
            setStatus(sub ? "subscribed" : "not-subscribed");
            return;
          }
        } catch {
          // fall through
        }
      }
      setStatus("not-subscribed");
    }
    check();
  }, []);

  async function handleEnable() {
    if (!vapidData?.vapidPublicKey) {
      toast.error(t("configError"));
      return;
    }
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.vapidPublicKey),
      });
      const json = subscription.toJSON();
      await client.notifications.subscribe({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
      });
      setStatus("subscribed");
      toast.success(t("enabled"));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubscribing(false);
    }
  }

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setStatus("dismissed");
  }

  if (status !== "not-subscribed") return null;

  return (
    <div className="glass-strong rounded-2xl p-4 mb-6 flex items-center gap-4 border border-[#4ecdc4]/20 bg-[#4ecdc4]/5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4ecdc4]/20">
        <Bell className="h-5 w-5 text-[#4ecdc4]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{t("title")}</p>
        <p className="text-xs text-muted-foreground">{t("description")}</p>
      </div>
      <button
        onClick={handleEnable}
        disabled={subscribing}
        className="shrink-0 rounded-xl bg-[#4ecdc4] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#4ecdc4]/80 disabled:opacity-50"
      >
        {subscribing ? t("enabling") : t("enable")}
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
