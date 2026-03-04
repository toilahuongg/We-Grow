"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { orpc, client } from "@/utils/orpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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

const DISMISS_KEY = "push-popup-dismissed";

export function PushNotificationPopup() {
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

  return (
    <Dialog open={status === "not-subscribed"} onOpenChange={(open) => !open && handleDismiss()}>
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4ecdc4]/20 mb-4">
          <Bell className="h-8 w-8 text-[#4ecdc4]" />
        </div>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
      </div>
      <DialogFooter className="sm:justify-center">
        <button
          onClick={handleDismiss}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground"
        >
          {t("notNow")}
        </button>
        <button
          onClick={handleEnable}
          disabled={subscribing}
          className="rounded-xl bg-[#4ecdc4] px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-[#4ecdc4]/80 disabled:opacity-50"
        >
          {subscribing ? t("enabling") : t("enable")}
        </button>
      </DialogFooter>
    </Dialog>
  );
}
