import { Actor, HttpAgent } from "@dfinity/agent";
import type { Identity } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { useCallback, useEffect, useState } from "react";

const ICP_LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";

async function fetchIcpBalance(identity: Identity): Promise<number> {
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
    { agent, canisterId: ICP_LEDGER_CANISTER_ID },
  );

  const principal = identity.getPrincipal();
  const balanceE8s = (await (ledger as any).icrc1_balance_of({
    owner: principal,
    subaccount: [],
  })) as bigint;
  return Number(balanceE8s) / 1e8;
}

export function useIcpBalance(identity?: Identity) {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!identity || identity.getPrincipal().isAnonymous()) {
      setBalance(null);
      return;
    }
    setIsLoading(true);
    try {
      const bal = await fetchIcpBalance(identity);
      setBalance(bal);
    } catch (err) {
      console.error("Failed to fetch ICP balance:", err);
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [identity]);

  useEffect(() => {
    refetch();
    if (!identity || identity.getPrincipal().isAnonymous()) return;
    const interval = setInterval(refetch, 30_000);
    return () => clearInterval(interval);
  }, [identity, refetch]);

  return { balance, isLoading, refetch };
}
