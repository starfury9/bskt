"use client";

import { useReadContract, useAccount } from "wagmi";
import { formatUnits } from "viem";
import { StablecoinERC20ABI } from "@/config/contracts";

export function useStablecoinBalance(stablecoinAddress: `0x${string}` | undefined) {
  const { address: userAddress } = useAccount();

  const { data: balanceRaw, refetch: refetchBalance, isLoading: isLoadingBalance } = useReadContract({
    address: stablecoinAddress,
    abi: StablecoinERC20ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!stablecoinAddress && !!userAddress,
    },
  });

  const { data: totalSupplyRaw, refetch: refetchSupply, isLoading: isLoadingSupply } = useReadContract({
    address: stablecoinAddress,
    abi: StablecoinERC20ABI,
    functionName: "totalSupply",
    query: {
      enabled: !!stablecoinAddress,
    },
  });

  const { data: symbol } = useReadContract({
    address: stablecoinAddress,
    abi: StablecoinERC20ABI,
    functionName: "symbol",
    query: {
      enabled: !!stablecoinAddress,
    },
  });

  const { data: name } = useReadContract({
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

  const refetch = () => {
    refetchBalance();
    refetchSupply();
  };

  return {
    balance,
    totalSupply,
    symbol: symbol || "",
    name: name || "",
    decimals: dec,
    isLoading: isLoadingBalance || isLoadingSupply,
    refetch,
  };
}
