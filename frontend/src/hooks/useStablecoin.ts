"use client";

import { useState, useCallback } from "react";
import { useReadContract, useAccount } from "wagmi";
import { formatUnits } from "viem";
import { StablecoinERC20ABI } from "@/config/contracts";

export function useStablecoinBalance(stablecoinAddress: `0x${string}` | undefined) {
  const { address: userAddress } = useAccount();
  const [isRefetching, setIsRefetching] = useState(false);

  const { data: balanceRaw, refetch: refetchBalance, isLoading: isLoadingBalance } = useReadContract({
    address: stablecoinAddress,
    abi: StablecoinERC20ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!stablecoinAddress && !!userAddress,
      refetchInterval: false,
    },
  });

  const { data: totalSupplyRaw, refetch: refetchSupply, isLoading: isLoadingSupply } = useReadContract({
    address: stablecoinAddress,
    abi: StablecoinERC20ABI,
    functionName: "totalSupply",
    query: {
      enabled: !!stablecoinAddress,
      refetchInterval: false,
    },
  });

  const { data: symbol, refetch: refetchSymbol } = useReadContract({
    address: stablecoinAddress,
    abi: StablecoinERC20ABI,
    functionName: "symbol",
    query: {
      enabled: !!stablecoinAddress,
    },
  });

  const { data: name, refetch: refetchName } = useReadContract({
    address: stablecoinAddress,
    abi: StablecoinERC20ABI,
    functionName: "name",
    query: {
      enabled: !!stablecoinAddress,
    },
  });

  const { data: decimals } = useReadContract({
    address: stablecoinAddress,
    abi: StablecoinERC20ABI,
    functionName: "decimals",
    query: {
      enabled: !!stablecoinAddress,
    },
  });

  const dec = decimals ?? 18;
  const balance = balanceRaw ? formatUnits(balanceRaw, dec) : "0";
  const totalSupply = totalSupplyRaw ? formatUnits(totalSupplyRaw, dec) : "0";

  const refetch = useCallback(async () => {
    if (!stablecoinAddress) return;
    
    setIsRefetching(true);
    try {
      await Promise.all([
        refetchBalance(),
        refetchSupply(),
        refetchSymbol(),
        refetchName(),
      ]);
    } catch (error) {
      console.error("Error refetching balance:", error);
    } finally {
      setIsRefetching(false);
    }
  }, [stablecoinAddress, refetchBalance, refetchSupply, refetchSymbol, refetchName]);

  return {
    balance,
    totalSupply,
    symbol: symbol || "",
    name: name || "",
    decimals: dec,
    isLoading: isLoadingBalance || isLoadingSupply || isRefetching,
    refetch,
  };
}
