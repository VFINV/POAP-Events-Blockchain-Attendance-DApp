"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Toaster } from "react-hot-toast";
import { CheckCircle2, Loader2, QrCode, Sparkles, AlertCircle, Wallet } from "lucide-react";
import { Web3Provider, useWeb3 } from "@/context/Web3Context";
import { usePOAP, EventDetails } from "@/hooks/usePOAP";
import { Button } from "@/components/ui/button";
import { buildCheckInUrl } from "@/lib/checkin";

interface ClaimResponse {
  success: boolean;
  alreadyClaimed?: boolean;
  txHash?: string;
  blockNumber?: number;
  message?: string;
  error?: string;
}

function CheckInContent() {
  const params = useParams<{ eventId: string }>();
  const searchParams = useSearchParams();
  const { account, isCorrectNetwork, isConnecting, connectWallet, switchNetwork } = useWeb3();
  const { getEventDetails } = usePOAP();

  const eventId = Number(params.eventId);
  const code = searchParams.get("code") || "";
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResponse | null>(null);

  const canonicalUrl = useMemo(() => {
    if (typeof window === "undefined" || !Number.isInteger(eventId)) return "";
    return buildCheckInUrl(window.location.origin, eventId);
  }, [eventId]);

  useEffect(() => {
    const loadEvent = async () => {
      if (!Number.isInteger(eventId) || eventId <= 0) {
        setIsLoadingEvent(false);
        return;
      }

      if (!account || !isCorrectNetwork) {
        setEventDetails(null);
        setIsLoadingEvent(false);
        return;
      }

      setIsLoadingEvent(true);
      const details = await getEventDetails(eventId);
      setEventDetails(details);
      setIsLoadingEvent(false);
    };

    loadEvent();
  }, [account, eventId, getEventDetails, isCorrectNetwork]);

  const handleClaim = async () => {
    if (!account || !Number.isInteger(eventId)) return;

    setIsClaiming(true);
    setClaimResult(null);

    try {
      const response = await fetch("/api/checkin/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, wallet: account, code }),
      });
      const result = (await response.json()) as ClaimResponse;
      setClaimResult(result);
    } catch (error) {
      setClaimResult({
        success: false,
        error: error instanceof Error ? error.message : "Unable to claim POAP",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const invalidEvent = !Number.isInteger(eventId) || eventId <= 0;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-chart-2/5 rounded-full blur-3xl" />
      </div>

      <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center justify-center">
        <div className="glass w-full rounded-3xl p-8 text-center shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/15">
            <QrCode className="h-10 w-10 text-primary" />
          </div>

          <div className="mb-8">
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.25em] text-primary">
              POAP Check-in
            </p>
            <h1 className="text-3xl font-bold text-foreground">
              Claim Event Badge
            </h1>
            <p className="mt-3 text-muted-foreground">
              Connect your wallet to receive this event attendance badge as an ERC-1155 NFT.
            </p>
          </div>

          {invalidEvent ? (
            <StatusBlock icon="error" title="Invalid event" message="This check-in link does not contain a valid event ID." />
          ) : isLoadingEvent ? (
            <StatusBlock icon="loading" title="Loading event" message="Checking the event details on-chain..." />
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-5 text-left">
                <p className="text-xs text-muted-foreground">Event</p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  Event #{eventId}
                </h2>
                {eventDetails && (
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Minted</p>
                      <p className="font-medium text-foreground">
                        {eventDetails.mintedCount} / {eventDetails.maxSupply}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className={eventDetails.active ? "font-medium text-success" : "font-medium text-warning"}>
                        {eventDetails.active ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {!code && (
                <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
                  This link is missing its QR check-in code. Ask the organizer to show the latest QR.
                </div>
              )}

              {!account ? (
                <Button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              ) : !isCorrectNetwork ? (
                <Button onClick={switchNetwork} className="w-full gap-2 bg-warning text-background hover:bg-warning/90">
                  <AlertCircle className="h-4 w-4" />
                  Switch to Sepolia
                </Button>
              ) : (
                <Button
                  onClick={handleClaim}
                  disabled={isClaiming || !code || claimResult?.success === true}
                  className="w-full gap-2 bg-chart-2 text-background hover:bg-chart-2/90"
                >
                  {isClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {isClaiming ? "Claiming Badge..." : "Claim POAP Badge"}
                </Button>
              )}

              {account && (
                <p className="font-mono text-xs text-muted-foreground">
                  Connected: {account.slice(0, 6)}...{account.slice(-4)}
                </p>
              )}

              {claimResult && (
                <div className={`rounded-2xl border p-4 text-left ${claimResult.success ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"}`}>
                  <div className="flex items-start gap-3">
                    {claimResult.success ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <p className={`font-semibold ${claimResult.success ? "text-success" : "text-destructive"}`}>
                        {claimResult.success
                          ? claimResult.alreadyClaimed
                            ? "Already claimed"
                            : "Badge claimed"
                          : "Claim failed"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {claimResult.success
                          ? claimResult.alreadyClaimed
                            ? claimResult.message
                            : "Your POAP was minted to your wallet. It should now appear in My Collection."
                          : claimResult.error}
                      </p>
                      {claimResult.txHash && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${claimResult.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 block break-all font-mono text-xs text-primary underline"
                        >
                          {claimResult.txHash}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {canonicalUrl && (
                <p className="break-all text-[10px] text-muted-foreground/70">
                  QR URL: {canonicalUrl}
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      <Toaster position="bottom-right" />
    </div>
  );
}

function StatusBlock({ icon, title, message }: { icon: "loading" | "error"; title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-6">
      {icon === "loading" ? (
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
      ) : (
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
      )}
      <h2 className="font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Web3Provider>
      <CheckInContent />
    </Web3Provider>
  );
}
