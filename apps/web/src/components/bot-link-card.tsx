"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, Check, LinkIcon, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { client } from "@/utils/orpc";

interface BotLinkCardProps {
  t: (key: string, params?: Record<string, unknown>) => string;
}

export function BotLinkCard({ t }: BotLinkCardProps) {
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: configStatus } = useQuery({
    queryKey: ["telegram", "isConfigured"],
    queryFn: () => client.telegram.isConfigured(),
  });

  const { data: linkStatus, refetch: refetchLink } = useQuery({
    queryKey: ["telegram", "linkStatus"],
    queryFn: () => client.telegram.getLinkStatus(),
    enabled: configStatus?.configured === true,
  });

  const generateMutation = useMutation({
    mutationFn: () => client.telegram.generateLinkToken(),
    onSuccess: (data: { token?: string }) => {
      setGeneratedToken(data.token ?? null);
    },
    onError: () => {
      toast.error(t("failedGenerate"));
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: () => client.telegram.unlinkAccount(),
    onSuccess: () => {
      toast.success(t("unlinked"));
      refetchLink();
      setGeneratedToken(null);
    },
    onError: () => {
      toast.error(t("failedUnlink"));
    },
  });

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!configStatus?.configured) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0088cc]/20">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <p className="font-medium">{t("title")}</p>
            <p className="text-sm text-muted-foreground">{t("notConfigured")}</p>
          </div>
        </div>
      </div>
    );
  }

  const isLinked = linkStatus?.linked === true;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0088cc]/20">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <p className="font-medium">{t("title")}</p>
            <p className="text-sm text-muted-foreground">
              {isLinked
                ? t("linked", { name: (linkStatus as any)?.telegramUsername ?? "" })
                : t("notLinked")}
            </p>
          </div>
        </div>
        {isLinked && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => unlinkMutation.mutate()}
            disabled={unlinkMutation.isPending}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <Unlink className="mr-1 h-3 w-3" />
            {t("unlink")}
          </Button>
        )}
      </div>

      {!isLinked && (
        <div className="space-y-3">
          {!generatedToken ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="w-full"
            >
              <LinkIcon className="mr-2 h-4 w-4" />
              {generateMutation.isPending ? t("generating") : t("generateToken")}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <code className="flex-1 text-center text-lg font-mono tracking-widest">
                  {generatedToken}
                </code>
                <button
                  onClick={() => handleCopy(generatedToken)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("telegramInstructions")}
              </p>
              <p className="text-xs text-muted-foreground/60">
                {t("tokenExpiry")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
