import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/config/contract";
import { getCheckInCode } from "@/lib/checkin";

interface ClaimRequestBody {
  eventId?: unknown;
  wallet?: unknown;
  code?: unknown;
}

function badRequest(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function parseRevert(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    if ("reason" in error && typeof error.reason === "string") return error.reason;
    if ("message" in error && typeof error.message === "string") {
      const match = error.message.match(/reason="([^"]+)"/);
      if (match) return match[1];
      return error.message.length > 180 ? `${error.message.slice(0, 180)}...` : error.message;
    }
  }
  return "Unknown check-in error";
}

export async function POST(request: NextRequest) {
  let body: ClaimRequestBody;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON request body");
  }

  const eventId = Number(body.eventId);
  const wallet = typeof body.wallet === "string" ? body.wallet.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return badRequest("Invalid event ID");
  }

  if (!ethers.utils.isAddress(wallet)) {
    return badRequest("Invalid wallet address");
  }

  if (code !== getCheckInCode(eventId)) {
    return badRequest("Invalid check-in QR code", 403);
  }

  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const issuerPrivateKey = process.env.ISSUER_PRIVATE_KEY;

  if (!rpcUrl || !issuerPrivateKey) {
    return badRequest("Check-in issuer is not configured on the server", 500);
  }

  try {
    const provider = new ethers.providers.StaticJsonRpcProvider(
      { url: rpcUrl, skipFetchSetup: true } as ethers.utils.ConnectionInfo,
      { chainId: 11155111, name: "sepolia" }
    );
    const issuer = new ethers.Wallet(issuerPrivateKey, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, issuer);

    const eventDetails = await contract.getPOAPEvent(eventId);
    if (!eventDetails.active) {
      return badRequest("This POAP event is not active", 409);
    }

    const existingBalance = await contract.balanceOf(wallet, eventId);
    if (existingBalance.gt(0)) {
      return NextResponse.json({
        success: true,
        alreadyClaimed: true,
        message: "This wallet already owns the event badge.",
      });
    }

    const tx = await contract.issuePOAP(wallet, eventId);
    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      alreadyClaimed: false,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    });
  } catch (error) {
    console.error("Check-in claim failed:", error);
    return badRequest(parseRevert(error), 500);
  }
}
