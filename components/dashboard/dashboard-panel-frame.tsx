import type { ReactNode } from "react";
import {
  BookmarkCheck,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
} from "lucide-react";

type DashboardPanelFrameProps = {
  children: ReactNode;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
};

export function DashboardPanelFrame({
  children,
  leftPanel,
  rightPanel,
}: DashboardPanelFrameProps) {
  return (
    <div className="dashboard-shell-grid relative z-10 grid w-full gap-6 px-margin-mobile pb-16 pt-16 md:px-margin-desktop">
      <aside className="dashboard-chrome-surface dashboard-side-panel dashboard-left-panel order-3 grid min-w-0 content-start">
        <PanelToggle
          controlsId="dashboard-left-panel-toggle"
          label="Toggle saved spaces panel"
          side="left"
        />
        <CollapsedRail
          icon={<BookmarkCheck className="h-5 w-5" aria-hidden />}
          label="Saved spaces"
        />
        <div className="dashboard-panel-content">{leftPanel}</div>
      </aside>

      <div className="dashboard-content-surface order-1 min-w-0 space-y-8">
        {children}
      </div>

      <aside className="dashboard-chrome-surface dashboard-side-panel dashboard-right-panel order-2 grid min-w-0 content-start">
        <PanelToggle
          controlsId="dashboard-right-panel-toggle"
          label="Toggle room controls panel"
          side="right"
        />
        <CollapsedRail
          icon={<Plus className="h-5 w-5" aria-hidden />}
          label="Room controls"
        />
        <div className="dashboard-panel-content">{rightPanel}</div>
      </aside>
    </div>
  );
}

function PanelToggle({
  controlsId,
  label,
  side,
}: {
  controlsId: string;
  label: string;
  side: "left" | "right";
}) {
  const CloseIcon = side === "left" ? PanelLeftClose : PanelRightClose;
  const OpenIcon = side === "left" ? PanelLeftOpen : PanelRightOpen;

  return (
    <>
      <input
        aria-label={label}
        className="dashboard-panel-checkbox sr-only"
        id={controlsId}
        type="checkbox"
      />
      <label
        className="dashboard-panel-toggle absolute top-3 z-20 h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-surface-container-low text-primary-fixed-dim transition hover:border-primary-fixed-dim/45 hover:bg-surface-container"
        htmlFor={controlsId}
        style={side === "left" ? { right: "0.75rem" } : { left: "0.75rem" }}
      >
        <CloseIcon className="dashboard-panel-icon-collapse h-4 w-4" aria-hidden />
        <OpenIcon className="dashboard-panel-icon-expand h-4 w-4" aria-hidden />
      </label>
    </>
  );
}

function CollapsedRail({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="dashboard-collapsed-rail min-h-[calc(100vh-4rem)] place-items-center pt-16 text-primary-fixed-dim">
      <div className="grid justify-items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-surface-container-low">
          {icon}
        </div>
        <span className="technical-label [writing-mode:vertical-rl]">
          {label}
        </span>
      </div>
    </div>
  );
}
