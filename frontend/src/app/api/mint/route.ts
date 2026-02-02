import { NextRequest, NextResponse } from "next/server";

// Real backend API URL
const BACKEND_URL = process.env.NEXT_PUBLIC_MINT_API_URL || 
  "http://ec2-3-27-63-126.ap-southeast-2.compute.amazonaws.com:3001/mint";

// API key (kept server-side for security)
const API_KEY = process.env.MINT_API_KEY || "";

/**
 * Proxy API endpoint for triggering mint requests.
 * Forwards requests to the real CRE workflow backend on AWS.
 * Keeps the API key server-side for security.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract fields from frontend request
    const beneficiaryAddress = body.beneficiary?.account || body.beneficiary;
    const amount = body.amount;
    const basket = body.basket || "DUSD"; // Default to DUSD

    // Validate required fields
    if (!beneficiaryAddress) {
      return NextResponse.json(
        { error: "Missing beneficiary address" },
        { status: 400 }
      );
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    console.log("Mint request - forwarding to backend:", {
      beneficiary: beneficiaryAddress,
      basket,
      amount,
    });

    // Forward to real backend
    const backendResponse = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify({
        beneficiary: beneficiaryAddress,
        basket: basket,
        amount: amount.toString(),
      }),
    });

    const backendData = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error("Backend error:", backendData);
      return NextResponse.json(
        {
          error: backendData.error || "Backend request failed",
          details: backendData,
        },
        { status: backendResponse.status }
      );
    }

    console.log("Backend response:", backendData);

    return NextResponse.json({
      success: true,
      message: `Mint request submitted for ${amount} ${basket} tokens`,
      transactionId: backendData.transactionId || backendData.txHash,
      data: backendData,
    });
  } catch (error) {
    console.error("Mint request error:", error);
    return NextResponse.json(
      {
        error: "Failed to process mint request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: "Basket Mint API Proxy",
    status: "healthy",
    backend: BACKEND_URL,
    endpoints: {
      "POST /api/mint": "Submit a mint request to CRE workflow backend",
    },
    supportedBaskets: ["AUDT", "DUSD"],
  });
}
