"use client";

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { useWeb3 } from "@/context/Web3Context";
import { ipfsToHttp } from "@/config/contract";

export interface POAPMetadata {
  name: string;
  description: string;
  image: string;
}

export interface POAPBalance {
  eventId: number;
  balance: number;
  metadata: POAPMetadata | null;
  uri: string;
}

export interface EventDetails {
  eventId?: number;
  uri: string;
  maxSupply: number;
  mintedCount: number;
  startTime: number;
  endTime: number;
  active: boolean;
  metadata?: POAPMetadata | null;
}

export interface Analytics {
  totalIssued: number;
  uniqueHolders: number;
  totalEvents: number;
}

export interface RecentMint {
  tokenId: number;
  attendee: string;
  issuer: string;
  timestamp?: number;
}

export function usePOAP() {
  const { contract, account } = useWeb3();
  const [isLoading, setIsLoading] = useState(false);

  const fetchMetadata = async (uri: string): Promise<POAPMetadata | null> => {
    try {
      if (!uri) return null;

      // Handle Data URIs (Base64 JSON) for prototype metadata
      if (uri.startsWith("data:application/json;base64,")) {
        const base64Data = uri.split(",")[1];
        const jsonString = atob(base64Data);
        const metadata = JSON.parse(jsonString);
        return {
          name: metadata.name || "Unknown POAP",
          description: metadata.description || "",
          image: ipfsToHttp(metadata.image || ""),
        };
      }

      // Handle standard IPFS/HTTP URIs
      const httpUrl = ipfsToHttp(uri);
      const response = await fetch(httpUrl);
      if (!response.ok) return null; // Silently fail to avoid crashing the UI
      
      const metadata = await response.json();
      return {
        name: metadata.name || "Unknown POAP",
        description: metadata.description || "",
        image: ipfsToHttp(metadata.image || ""),
      };
    } catch (error) {
      console.error("Error fetching metadata:", error);
      return null;
    }
  };

  const getAnalytics = useCallback(async (): Promise<Analytics> => {
    if (!contract) return { totalIssued: 0, uniqueHolders: 0, totalEvents: 0 };
    
    try {
      const [issued, holders, createdIds] = await Promise.all([
        contract.totalIssued(),
        contract.uniqueHoldersCount(),
        contract.getCreatedTokenIds()
      ]);
      
      const toNum = (val: any) => (typeof val?.toNumber === "function" ? val.toNumber() : Number(val));
      
      return {
        totalIssued: toNum(issued),
        uniqueHolders: toNum(holders),
        totalEvents: createdIds.length
      };
    } catch (error) {
      console.error("Error fetching analytics:", error);
      return { totalIssued: 0, uniqueHolders: 0, totalEvents: 0 };
    }
  }, [contract]);

  const getAllEvents = useCallback(async (): Promise<EventDetails[]> => {
    if (!contract) return [];

    try {
      const createdIds = await contract.getCreatedTokenIds();
      const events: EventDetails[] = [];
      
      for (const idRaw of createdIds) {
        const id = typeof idRaw?.toNumber === "function" ? idRaw.toNumber() : Number(idRaw);
        const [details, uri] = await Promise.all([
          contract.getPOAPEvent(id),
          contract.uri(id)
        ]);
        
        const toNum = (val: any) => (typeof val?.toNumber === "function" ? val.toNumber() : Number(val));
        const metadata = await fetchMetadata(uri);

        events.push({
          eventId: id,
          uri: uri,
          maxSupply: toNum(details.maxSupply),
          mintedCount: toNum(details.minted),
          startTime: toNum(details.startTime),
          endTime: toNum(details.endTime),
          active: !!details.active,
          metadata
        });
      }
      
      return events;
    } catch (error) {
      console.error("Error fetching all events:", error);
      return [];
    }
  }, [contract]);

  const getRecentMints = useCallback(async (limit: number = 5): Promise<RecentMint[]> => {
    if (!contract) return [];

    try {
      // Get the latest block to determine range
      const latestBlock = await contract.provider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 5000); // Reduce range to 5000 blocks for better compatibility
      
      const filter = contract.filters.POAPIssued();
      const events = await contract.queryFilter(filter, fromBlock, latestBlock);
      
      const recentEvents = events
        .sort((a: any, b: any) => b.blockNumber - a.blockNumber)
        .slice(0, limit);

      return recentEvents.map((event: any) => {
        const args = event.args;
        return {
          tokenId: typeof args.tokenId?.toNumber === "function" ? args.tokenId.toNumber() : Number(args.tokenId),
          attendee: args.attendee,
          issuer: args.issuer
        };
      });
    } catch (error) {
      console.error("Error fetching recent mints:", error);
      // Return empty instead of crashing
      return [];
    }
  }, [contract]);

  const getHolderPOAPBalances = useCallback(async (): Promise<POAPBalance[]> => {
    if (!account || !contract) return [];

    setIsLoading(true);
    try {
      const result = await contract.getHolderPOAPBalances(account);
      const tokenIds = result[0] || result.tokenIds || [];
      const balances = result[1] || result.balances || [];
      
      if (!tokenIds || tokenIds.length === 0) {
        return [];
      }

      const poaps: POAPBalance[] = [];
      
      for (let i = 0; i < tokenIds.length; i++) {
        const tokenIdRaw = tokenIds[i];
        const balanceRaw = balances[i];
        
        const tokenId = typeof tokenIdRaw?.toNumber === "function" ? tokenIdRaw.toNumber() : Number(tokenIdRaw);
        const balance = typeof balanceRaw?.toNumber === "function" ? balanceRaw.toNumber() : Number(balanceRaw);
        
        if (balance > 0) {
          try {
            const uri = await contract.uri(tokenId);
            const metadata = await fetchMetadata(uri);
            poaps.push({
              eventId: tokenId,
              balance: balance,
              uri,
              metadata,
            });
          } catch (e) {
            console.warn(`Could not fetch metadata for token ${tokenId}`, e);
          }
        }
      }
      
      return poaps;
    } catch (error) {
      console.error("Error fetching POAPs:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [contract, account]);


  const createPOAPEvent = useCallback(
    async (uri: string, maxSupply: number, startTime: Date, endTime: Date): Promise<number | null> => {
      if (!contract) {
        toast.error("Please connect your wallet first");
        return null;
      }

      const startTimestamp = Math.floor(startTime.getTime() / 1000);
      const endTimestamp = Math.floor(endTime.getTime() / 1000);

      const toastId = toast.loading("Creating POAP event...");

      try {
        const tx = await contract.createPOAPEvent(uri, maxSupply, startTimestamp, endTimestamp);
        toast.loading("Transaction submitted. Waiting for confirmation...", { id: toastId });
        
        const receipt = await tx.wait();
        
        // Find the event ID from the event logs
        // Ethers v5 uses events property
        const event = receipt.events?.find((e: any) => e.event === "POAPEventCreated");
        const tokenIdRaw = event?.args?.tokenId;
        const tokenId = tokenIdRaw !== undefined ? (typeof tokenIdRaw?.toNumber === "function" ? tokenIdRaw.toNumber() : Number(tokenIdRaw)) : null;
        
        toast.success(`POAP Event created successfully!${tokenId !== null ? ` Token ID: ${tokenId}` : ""}`, { id: toastId });
        return tokenId;
      } catch (error: unknown) {
        console.error("Error creating event:", error);
        const errorMessage = parseError(error);
        toast.error(`Failed to create event: ${errorMessage}`, { id: toastId });
        return null;
      }
    },
    [contract]
  );

  const issuePOAP = useCallback(
    async (eventId: number, recipient: string | string[]): Promise<boolean> => {
      if (!contract) {
        toast.error("Please connect your wallet first");
        return false;
      }

      const recipients = Array.isArray(recipient) ? recipient : [recipient];
      
      for (const addr of recipients) {
        if (!ethers.utils.isAddress(addr.trim())) {
          toast.error(`Invalid wallet address: ${addr}`);
          return false;
        }
      }

      const toastId = toast.loading(recipients.length > 1 ? `Issuing ${recipients.length} badges...` : "Issuing POAP badge...");

      try {
        let tx;
        if (recipients.length > 1) {
          tx = await contract.batchIssuePOAPs(recipients.map(r => r.trim()), eventId);
        } else {
          tx = await contract.issuePOAP(recipients[0].trim(), eventId);
        }
        
        toast.loading("Transaction submitted. Waiting for confirmation...", { id: toastId });
        await tx.wait();
        
        toast.success(`Badge(s) issued successfully!`, { id: toastId });
        return true;
      } catch (error: unknown) {
        console.error("Error issuing POAP:", error);
        const errorMessage = parseError(error);
        toast.error(`Failed to issue POAP: ${errorMessage}`, { id: toastId });
        return false;
      }
    },
    [contract]
  );

  const getEventDetails = useCallback(
    async (eventId: number): Promise<EventDetails | null> => {
      if (!contract) {
        // Return mock data if no contract
        return {
          eventId,
          uri: "",
          maxSupply: 1000,
          mintedCount: 1,
          startTime: Math.floor(Date.now() / 1000) - 86400,
          endTime: Math.floor(Date.now() / 1000) + 86400,
          active: true,
        };
      }

      try {
        const [details, uri] = await Promise.all([
          contract.getPOAPEvent(eventId),
          contract.uri(eventId)
        ]);
        
        const toNum = (val: any) => (typeof val?.toNumber === "function" ? val.toNumber() : Number(val));

        return {
          eventId,
          uri: uri,
          maxSupply: toNum(details.maxSupply),
          mintedCount: toNum(details.minted),
          startTime: toNum(details.startTime),
          endTime: toNum(details.endTime),
          active: !!details.active,
        };
      } catch (error) {
        console.error(`Error fetching event ${eventId} details:`, error);
        // Fallback for mock/non-existent tokens
        return {
          eventId,
          uri: "",
          maxSupply: 100,
          mintedCount: 1,
          startTime: Math.floor(Date.now() / 1000),
          endTime: Math.floor(Date.now() / 1000) + 86400,
          active: true,
        };
      }
    },
    [contract]
  );

  const setPOAPEventActive = useCallback(
    async (eventId: number, active: boolean): Promise<boolean> => {
      if (!contract) {
        toast.error("Please connect your wallet first");
        return false;
      }

      const toastId = toast.loading(`${active ? "Activating" : "Deactivating"} POAP event...`);

      try {
        const tx = await contract.setPOAPEventActive(eventId, active);
        toast.loading("Transaction submitted. Waiting for confirmation...", { id: toastId });
        
        await tx.wait();
        
        toast.success(`POAP event ${active ? "activated" : "deactivated"} successfully!`, { id: toastId });
        return true;
      } catch (error: unknown) {
        console.error("Error updating event status:", error);
        const errorMessage = parseError(error);
        toast.error(`Failed to update event status: ${errorMessage}`, { id: toastId });
        return false;
      }
    },
    [contract]
  );

  return {
    isLoading,
    getAnalytics,
    getAllEvents,
    getRecentMints,
    getHolderPOAPBalances,
    createPOAPEvent,
    issuePOAP,
    setPOAPEventActive,
    getEventDetails,
    fetchMetadata,
  };
}

// Helper functions
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function parseError(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    // User rejected transaction
    if ("code" in error && error.code === 4001) {
      return "Transaction rejected by user";
    }
    
    // Contract revert
    if ("reason" in error && typeof error.reason === "string") {
      return error.reason;
    }
    
    // Generic error message
    if ("message" in error && typeof error.message === "string") {
      // Try to extract revert reason from error message
      const revertMatch = error.message.match(/reason="([^"]+)"/);
      if (revertMatch) return revertMatch[1];
      
      // Check for common errors
      if (error.message.includes("insufficient funds")) {
        return "Insufficient funds for transaction";
      }
      if (error.message.includes("nonce")) {
        return "Transaction nonce error. Please reset MetaMask";
      }
      
      return error.message.length > 100 ? error.message.slice(0, 100) + "..." : error.message;
    }
  }
  
  return "Unknown error occurred";
}
