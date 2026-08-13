"use client";

import { useWeb3 } from "@/context/Web3Context";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, AlertTriangle, Loader2 } from "lucide-react";
import { SUPPORTED_CHAINS, ACTIVE_NETWORK } from "@/config/contract";

export function Navbar() {
  const { account, isCorrectNetwork, isConnecting, connectWallet, disconnectWallet, switchNetwork } = useWeb3();

  const targetChain = SUPPORTED_CHAINS[ACTIVE_NETWORK];

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-glass-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center animate-pulse-glow">
                <span className="text-xl font-bold text-primary">P</span>
              </div>
              <div className="absolute -inset-1 bg-primary/20 rounded-xl blur-md -z-10" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground">POAP Hub</span>
              <span className="text-xs text-muted-foreground">Proof of Attendance</span>
            </div>
          </div>

          {/* Network Warning Banner (inline for desktop) */}
          {account && !isCorrectNetwork && (
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-warning/10 border border-warning/30">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-sm text-warning">
                Wrong network. Please switch to {targetChain.name}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={switchNetwork}
                className="ml-2 h-7 text-xs border-warning/50 text-warning hover:bg-warning/20"
              >
                Switch Network
              </Button>
            </div>
          )}

          {/* Wallet Connection */}
          <div className="flex items-center gap-4">
            {account ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs text-muted-foreground">Connected</span>
                  <span className="text-sm font-mono text-foreground">
                    {truncateAddress(account)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isCorrectNetwork ? "bg-success" : "bg-warning"} animate-pulse`} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnectWallet}
                    className="gap-2 glass-hover"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Disconnect</span>
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={connectWallet}
                disabled={isConnecting}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wallet className="w-4 h-4" />
                )}
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Network Warning */}
        {account && !isCorrectNetwork && (
          <div className="md:hidden flex items-center justify-between gap-2 px-4 py-3 mb-2 rounded-lg bg-warning/10 border border-warning/30">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-sm text-warning">
                Switch to {targetChain.name}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={switchNetwork}
              className="h-7 text-xs border-warning/50 text-warning hover:bg-warning/20"
            >
              Switch
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
