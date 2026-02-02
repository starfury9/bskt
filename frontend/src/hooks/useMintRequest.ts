"use client";

import { useState } from "react";
import { useAccount } from "wagmi";

export interface MintRequestResult {
  success: boolean;
  transactionId?: string;
  message?: string;
  error?: string;
  data?: Record<string, unknown>;
}

export function useMintRequest() {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MintRequestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestMint = async (
    amount: string,
    beneficiary: string,
    basket: string = "DUSD"
  ) => {
    if (!address) {
      setError("Wallet not connected");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const beneficiaryAddress = beneficiary || address;

      const payload = {
        beneficiary: beneficiaryAddress,
        amount: amount,
        basket: basket,
      };

      // Call the proxy API route (which forwards to real backend)
      const response = await fetch("/api/mint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      setResult({
        success: true,
        transactionId: data.transactionId,
        message: data.message || `Mint request submitted for ${amount} ${basket}`,
        data: data.data,
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to submit mint request";
      setError(errorMessage);
      setResult({
        success: false,
        error: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return {
    requestMint,
    isLoading,
    result,
    error,
    reset,
  };
}
