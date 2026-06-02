import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/ui";

type AppContainerProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function AppContainer({
  children,
  className,
  ...props
}: AppContainerProps) {
  return (
    <div
      className={cx(
        "mx-auto w-full max-w-[1440px] px-margin-mobile py-8 md:px-margin-desktop",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
