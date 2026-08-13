"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { usePOAP, POAPBalance } from "@/hooks/usePOAP";
import { useWeb3 } from "@/context/Web3Context";
import { Loader2, ImageOff, Sparkles, Calendar, Users, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function MyCollection() {
  const { account } = useWeb3();
  const { getHolderPOAPBalances, getEventDetails, isLoading } = usePOAP();
  const [poaps, setPoaps] = useState<POAPBalance[]>([]);
  const [extraDetails, setExtraDetails] = useState<Record<number, any>>({});
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  
  // Detail View State
  const [selectedPoap, setSelectedPoap] = useState<POAPBalance | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    const fetchPOAPs = async () => {
      if (account) {
        const balances = await getHolderPOAPBalances();
        setPoaps(balances);
        
        // Fetch extra details for each POAP
        balances.forEach(async (poap) => {
          const details = await getEventDetails(poap.eventId);
          if (details) {
            setExtraDetails(prev => ({ ...prev, [poap.eventId]: details }));
          }
        });
      }
    };
    fetchPOAPs();
  }, [account, getHolderPOAPBalances, getEventDetails]);

  const handlePoapClick = (poap: POAPBalance) => {
    setSelectedPoap(poap);
  };

  const handleImageError = (eventId: number) => {
    setImageErrors((prev) => new Set(prev).add(eventId));
  };

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-2xl glass flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-muted-foreground" />
          </div>
          <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-xl -z-10" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Connect Your Wallet</h3>
        <p className="text-muted-foreground max-w-sm">
          Connect your wallet to view your POAP collection and proof of attendance badges.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your collection...</p>
      </div>
    );
  }

  if (poaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-2xl glass flex items-center justify-center">
            <ImageOff className="w-12 h-12 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No POAPs Yet</h3>
        <p className="text-muted-foreground max-w-sm">
          You haven&apos;t collected any POAPs yet. Attend events to earn badges!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Collection</h2>
          <p className="text-muted-foreground">
            {poaps.length} POAP{poaps.length !== 1 ? "s" : ""} collected
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {poaps.map((poap) => (
          <div
            key={poap.eventId}
            onClick={() => handlePoapClick(poap)}
            className="group relative glass rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] glass-hover cursor-pointer"
          >
            {/* Glow effect on hover */}
            <div className="absolute -inset-1 bg-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            
            {/* Image container */}
            <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary mb-4">
              {imageErrors.has(poap.eventId) ? (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <ImageOff className="w-12 h-12 text-muted-foreground" />
                </div>
              ) : (
                <Image
                  src={poap.metadata?.image || "/placeholder.svg"}
                  alt={poap.metadata?.name || "POAP Badge"}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  onError={() => handleImageError(poap.eventId)}
                />
              )}
              
              {/* Badge overlay */}
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm text-xs font-medium text-foreground">
                #{poap.eventId}
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-foreground truncate">
                  {poap.metadata?.name || "Unknown POAP"}
                </h3>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                  <Calendar className="w-2.5 h-2.5" />
                  {extraDetails[poap.eventId] 
                    ? new Date(extraDetails[poap.eventId].startTime * 1000).toLocaleDateString()
                    : "..."}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                  <Users className="w-2.5 h-2.5" />
                  {extraDetails[poap.eventId] 
                    ? `${extraDetails[poap.eventId].mintedCount}/${extraDetails[poap.eventId].maxSupply}`
                    : "..."}
                </div>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-1">
                {poap.metadata?.description || "No description available"}
              </p>
              
              {poap.balance > 1 && (
                <div className="flex items-center gap-1 text-xs text-primary font-medium">
                  <Sparkles className="w-3 h-3" />
                  <span>x{poap.balance} collected</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedPoap} onOpenChange={(open) => !open && setSelectedPoap(null)}>
        <DialogContent className="bg-card border border-border sm:max-w-md shadow-2xl shadow-primary/5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Badge Details</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedPoap && (
            <div className="space-y-6 py-4">
              <div className="relative aspect-square w-48 mx-auto rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src={selectedPoap.metadata?.image || "/placeholder.svg"}
                  alt={selectedPoap.metadata?.name || "POAP Badge"}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {selectedPoap.metadata?.name || "Unknown POAP"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedPoap.metadata?.description || "No description available"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Calendar className="w-3 h-3" />
                      <span>Event Date</span>
                    </div>
                    <p className="text-sm font-semibold">
                      {extraDetails[selectedPoap.eventId] 
                        ? new Date(extraDetails[selectedPoap.eventId].startTime * 1000).toLocaleDateString() 
                        : "Loading..."}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Users className="w-3 h-3" />
                      <span>Total Minted</span>
                    </div>
                    <p className="text-sm font-semibold">
                      {extraDetails[selectedPoap.eventId] 
                        ? `${extraDetails[selectedPoap.eventId].mintedCount} / ${extraDetails[selectedPoap.eventId].maxSupply}` 
                        : "Loading..."}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 gap-2" asChild>
                    <a href={selectedPoap.uri} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      Metadata
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}