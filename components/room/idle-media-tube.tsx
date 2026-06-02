import type { RoomSnapshot } from "@/lib/rooms";

type IdleMediaTubeProps = {
  mode: RoomSnapshot["mode"];
};

export function IdleMediaTube({ mode }: IdleMediaTubeProps) {
  return (
    <svg
      aria-hidden
      className="idle-media-tube"
      data-mode={mode}
      focusable="false"
      preserveAspectRatio="none"
      style={{
        height: "calc(100% + 14px)",
        left: "-7px",
        top: "-7px",
        width: "calc(100% + 14px)",
      }}
      viewBox="0 0 100 100"
    >
      <rect
        className="idle-media-tube__glass"
        height="99"
        pathLength="1000"
        rx="1.4"
        ry="1.4"
        style={{ strokeWidth: 5 }}
        width="99"
        x="0.5"
        y="0.5"
      />
      <rect
        className="idle-media-tube__tail"
        height="99"
        pathLength="1000"
        rx="1.4"
        ry="1.4"
        style={{
          animationDuration: "9.6s",
          strokeDasharray: "420 580",
          strokeWidth: 10,
        }}
        width="99"
        x="0.5"
        y="0.5"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="9.6s"
          from="0"
          repeatCount="indefinite"
          to="-1000"
        />
      </rect>
      <rect
        className="idle-media-tube__beam"
        height="99"
        pathLength="1000"
        rx="1.4"
        ry="1.4"
        style={{
          animationDuration: "9.6s",
          strokeDasharray: "300 700",
          strokeWidth: 5.5,
        }}
        width="99"
        x="0.5"
        y="0.5"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="9.6s"
          from="0"
          repeatCount="indefinite"
          to="-1000"
        />
      </rect>
    </svg>
  );
}
