import { getAccountSummary } from "@/lib/account";

import { AccountCommandPanel } from "./account-command-panel";

type AccountEntryProps = {
  className?: string;
  compact?: boolean;
  nextPath?: string;
  roomId?: string;
};

export async function AccountEntry({
  className,
  compact,
  nextPath = "/",
  roomId,
}: AccountEntryProps) {
  const account = await getAccountSummary();

  return (
    <AccountCommandPanel
      account={account}
      className={className}
      compact={compact}
      nextPath={nextPath}
      roomId={roomId}
    />
  );
}
