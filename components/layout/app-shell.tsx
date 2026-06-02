import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/ui";

type AppShellProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function AppShell({ children, className, ...props }: AppShellProps) {
  return (
    <main
      className={cx(
        "min-h-screen bg-background text-on-background selection:bg-primary-fixed-dim/25",
        className,
      )}
      {...props}
    >
      {children}
    </main>
  );
}
