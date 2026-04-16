"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CopyIcon, RefreshCcwIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  expoUrl: string | null;
  webPreviewUrl: string;
}

export const FragmentMobile = ({ expoUrl, webPreviewUrl }: Props) => {
  const [iframeKey, setIframeKey] = useState(0);

  if (!expoUrl) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-sm space-y-2">
          <div className="text-sm font-medium">Tunnel is still starting</div>
          <p className="text-xs text-muted-foreground">
            Metro + the public tunnel take 20–60 seconds to come up on a cold sandbox.
            Your QR code will appear here automatically once Expo is ready.
          </p>
        </div>
      </div>
    );
  }

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(expoUrl);
      toast.success("Copied expo:// URL");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border bg-muted/30 p-6">
        <div className="rounded-lg bg-white p-4">
          <QRCodeSVG value={expoUrl} size={220} level="M" />
        </div>
        <div className="max-w-xs space-y-1 text-center">
          <div className="text-sm font-medium">Scan with Expo Go</div>
          <p className="text-xs text-muted-foreground">
            Install{" "}
            <a
              href="https://expo.dev/go"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Expo Go
            </a>{" "}
            from the App Store or Play Store, then scan this QR code to run the app on your phone.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={copyUrl}>
            <CopyIcon className="size-3" /> Copy URL
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={expoUrl} target="_blank" rel="noreferrer">
              <ExternalLinkIcon className="size-3" /> Open
            </a>
          </Button>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-lg border">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-xs text-muted-foreground">Phone preview (react-native-web)</div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Reload preview"
            onClick={() => setIframeKey((k) => k + 1)}
          >
            <RefreshCcwIcon className="size-3" />
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center bg-muted/40 p-4">
          <div className="h-[640px] w-[320px] overflow-hidden rounded-[40px] border-[10px] border-zinc-900 bg-white shadow-xl">
            <iframe
              key={iframeKey}
              src={webPreviewUrl}
              className="h-full w-full"
              title="Mobile app preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
