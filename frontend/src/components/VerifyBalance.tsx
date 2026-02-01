"use client";

import { useAccount } from "wagmi";
import { useStablecoinBalance } from "@/hooks/useStablecoin";
import { BasketCreatedResult } from "@/hooks/useBasketFactory";

interface VerifyBalanceProps {
  basket: BasketCreatedResult | null;
}

export function VerifyBalance({ basket }: VerifyBalanceProps) {
  const { address, isConnected } = useAccount();

  const { balance, totalSupply, symbol, name, isLoading, refetch } =
    useStablecoinBalance(basket?.stablecoinAddress);

  const isDisabled = !isConnected || !basket;

  const formatNumber = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "0";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className={`card ${isDisabled ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`step-indicator ${basket ? "step-active" : "step-inactive"}`}>
            3
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Verify Balance</h2>
            <p className="text-sm text-slate-400">
              Check your stablecoin holdings
            </p>
          </div>
        </div>

        {basket && (
          <button
            onClick={refetch}
            disabled={isLoading}
            className="btn-secondary flex items-center gap-2"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        )}
      </div>

      {!basket ? (
        <div className="bg-slate-900/50 rounded-lg p-8 text-center">
          <p className="text-slate-400 mb-2">Create a basket first</p>
          <p className="text-sm text-slate-500">
            Your balance will appear here after minting
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Token Info */}
          <div className="bg-slate-900/30 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-lg font-bold">
                {symbol.charAt(0) || "?"}
              </div>
              <div>
                <p className="font-semibold text-white">{name || "Unknown Token"}</p>
                <p className="text-sm text-slate-400">{symbol || "???"}</p>
              </div>
            </div>
            <div className="text-xs font-mono text-slate-500 break-all">
              {basket.stablecoinAddress}
            </div>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Your Balance */}
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-sm text-slate-300">Your Balance</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">
                  {isLoading ? "..." : formatNumber(balance)}
                </span>
                <span className="text-lg text-indigo-400">{symbol}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-mono truncate">
                {address}
              </p>
            </div>

            {/* Total Supply */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-sm text-slate-300">Total Supply</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">
                  {isLoading ? "..." : formatNumber(totalSupply)}
                </span>
                <span className="text-lg text-purple-400">{symbol}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                All minted tokens across all holders
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <a
              href={`https://sepolia.etherscan.io/token/${basket.stablecoinAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Token
            </a>
            <a
              href={`https://sepolia.etherscan.io/address/${basket.mintingConsumerAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              View Consumer
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
