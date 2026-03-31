import { Actor, HttpAgent } from "@dfinity/agent";
import type { Identity } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { useCallback, useEffect, useState } from "react";

// Chain-Key token ledger canister IDs on ICP mainnet
const CK_TOKENS = [
  {
    symbol: "ckBTC",
    name: "Chain-Key Bitcoin",
    canisterId: "mxzaz-hqaaa-aaaar-qaada-cai",
    decimals: 8,
    color: "#f7931a",
  },
  {
    symbol: "ckETH",
    name: "Chain-Key Ethereum",
    canisterId: "ss2fx-dyaaa-aaaar-qacoq-cai",
    decimals: 18,
    color: "#627eea",
  },
  {
    symbol: "ckUSDT",
    name: "Chain-Key USDT",
    canisterId: "cngnf-vqaaa-aaaar-qag4q-cai",
    decimals: 6,
    color: "#26a17b",
  },
  {
    symbol: "ckSOL",
    name: "Chain-Key Solana",
    canisterId: "g4tto-rqaaa-aaaar-qageq-cai",
    decimals: 9,
    color: "#9945ff",
  },
] as const;

export type CkTokenInfo = (typeof CK_TOKENS)[number];

export type CkTokenBalance = {
  symbol: string;
  name: string;
  canisterId: string;
  decimals: number;
  color: string;
  balance: number | null;
  isLoading: boolean;
};

async function fetchTokenBalance(
  identity: Identity,
  canisterId: string,
  decimals: number,
): Promise<number> {
  const agent = await HttpAgent.create({
    host: "https://icp-api.io",
    identity,
  });

  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });

  const ledger = Actor.createActor(
    ({ IDL: idl }) =>
      idl.Service({
        icrc1_balance_of: idl.Func([Account], [idl.Nat], ["query"]),
      }),
    { agent, canisterId },
  );

  const principal = identity.getPrincipal();
  const balanceRaw = (await (ledger as any).icrc1_balance_of({
    owner: principal,
    subaccount: [],
  })) as bigint;
  return Number(balanceRaw) / 10 ** decimals;
}

export function useCkTokenBalances(identity?: Identity) {
  const [balances, setBalances] = useState<Record<string, number | null>>({});
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!identity || identity.getPrincipal().isAnonymous()) {
      setBalances({});
      return;
    }
    setIsLoading(true);
    const results: Record<string, number | null> = {};
    await Promise.all(
      CK_TOKENS.map(async (token) => {
        try {
          results[token.symbol] = await fetchTokenBalance(
            identity,
            token.canisterId,
            token.decimals,
          );
        } catch (err) {
          console.error(`Failed to fetch ${token.symbol} balance:`, err);
          results[token.symbol] = null;
        }
      }),
    );
    setBalances(results);
    setIsLoading(false);
  }, [identity]);

  useEffect(() => {
    refetch();
    if (!identity || identity.getPrincipal().isAnonymous()) return;
    const interval = setInterval(refetch, 60_000);
    return () => clearInterval(interval);
  }, [identity, refetch]);

  const tokens: CkTokenBalance[] = CK_TOKENS.map((t) => ({
    ...t,
    balance: balances[t.symbol] ?? null,
    isLoading,
  }));

  return { tokens, isLoading, refetch };
}

export { CK_TOKENS };
