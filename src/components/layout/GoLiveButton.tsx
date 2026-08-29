import NextLink from "next/link";
import { useBranding } from "@/components/layout/BrandingProvider";

// Vector source: go_live_button.svg (2026-08-29). Every path shares one
// fill (frame, broadcast icon, and the "LIVE" wordmark are all the same
// color — 2026-08-29 revision, see GoLiveButton below for the separate
// button-background color) — paths themselves are unchanged from the
// source file.
function GoLiveSvg({ color, className }: { color: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 1146 387"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ fillRule: "evenodd", clipRule: "evenodd", strokeLinejoin: "round", strokeMiterlimit: 2 }}
    >
      <g fill={color}>
        <g transform="matrix(1,0,0,1,-3432.15,-1293.13)">
          <path
            d="M3452.15,1659.18L4557.97,1659.18L4557.97,1313.13L3452.15,1313.13L3452.15,1659.18ZM4577.97,1679.18L3432.15,1679.18L3432.15,1293.13L4577.97,1293.13L4577.97,1679.18Z"
            style={{ fillRule: "nonzero" }}
          />
        </g>
        <g transform="matrix(0.664931,0,0,0.664931,-462.473,-174.142)">
          <g transform="matrix(0.704298,0,0,0.704298,-1072.88,-1317.45)">
            <path
              d="M3242.65,2654.6C3242.65,2631.03 3238.18,2608.03 3229.34,2586.26C3220.19,2563.72 3206.75,2543.5 3189.41,2526.15C3182.31,2519.05 3170.81,2519.05 3163.71,2526.15C3156.61,2533.24 3156.61,2544.75 3163.71,2551.84C3177.61,2565.74 3188.36,2581.91 3195.67,2599.93C3202.73,2617.33 3206.31,2635.73 3206.31,2654.6C3206.31,2673.48 3202.73,2691.87 3195.67,2709.28C3188.36,2727.3 3177.61,2743.48 3163.71,2757.37C3156.61,2764.47 3156.61,2775.97 3163.71,2783.07C3167.26,2786.62 3171.91,2788.39 3176.56,2788.39C3181.21,2788.39 3185.86,2786.62 3189.41,2783.07C3206.76,2765.72 3220.19,2745.49 3229.34,2722.95C3238.18,2701.18 3242.65,2678.19 3242.65,2654.6Z"
              style={{ fillRule: "nonzero" }}
            />
          </g>
          <g transform="matrix(0.704298,0,0,0.704298,-1072.88,-1317.45)">
            <path
              d="M3304.14,2557.47C3291.14,2525.43 3272.04,2496.68 3247.38,2472.02C3240.28,2464.93 3228.78,2464.93 3221.68,2472.02C3214.59,2479.12 3214.59,2490.62 3221.68,2497.72C3242.9,2518.92 3259.31,2543.62 3270.47,2571.13C3281.26,2597.71 3286.73,2625.79 3286.73,2654.6C3286.73,2683.42 3281.26,2711.5 3270.47,2738.08C3259.31,2765.59 3242.9,2790.29 3221.68,2811.49C3214.59,2818.59 3214.59,2830.1 3221.68,2837.19C3225.23,2840.74 3229.89,2842.52 3234.54,2842.52C3239.19,2842.52 3243.83,2840.74 3247.38,2837.19C3272.04,2812.53 3291.14,2783.78 3304.15,2751.75C3316.7,2720.81 3323.07,2688.12 3323.07,2654.6C3323.07,2621.09 3316.7,2588.41 3304.14,2557.47Z"
              style={{ fillRule: "nonzero" }}
            />
          </g>
          <g transform="matrix(0.704298,0,0,0.704298,-1072.88,-1317.45)">
            <path
              d="M2810.14,2654.61C2810.14,2678.19 2814.62,2701.18 2823.46,2722.95C2832.61,2745.49 2846.04,2765.72 2863.39,2783.07C2870.48,2790.17 2881.99,2790.17 2889.09,2783.07C2896.18,2775.98 2896.18,2764.47 2889.09,2757.37C2875.19,2743.48 2864.44,2727.3 2857.12,2709.29C2850.06,2691.88 2846.48,2673.48 2846.48,2654.61C2846.48,2635.74 2850.06,2617.34 2857.12,2599.93C2864.44,2581.92 2875.19,2565.74 2889.09,2551.84C2896.18,2544.75 2896.18,2533.25 2889.09,2526.15C2885.54,2522.6 2880.89,2520.83 2876.24,2520.83C2871.59,2520.83 2866.94,2522.6 2863.39,2526.15C2846.04,2543.5 2832.6,2563.72 2823.46,2586.27C2814.62,2608.04 2810.14,2631.03 2810.14,2654.61Z"
              style={{ fillRule: "nonzero" }}
            />
          </g>
          <g transform="matrix(0.704298,0,0,0.704298,-1072.88,-1317.45)">
            <path
              d="M2748.65,2751.75C2761.65,2783.78 2780.75,2812.53 2805.41,2837.2C2812.51,2844.29 2824.01,2844.29 2831.11,2837.2C2838.2,2830.1 2838.2,2818.6 2831.11,2811.5C2809.9,2790.29 2793.49,2765.59 2782.33,2738.08C2771.53,2711.51 2766.06,2683.42 2766.06,2654.61C2766.06,2625.8 2771.53,2597.72 2782.33,2571.13C2793.49,2543.62 2809.9,2518.92 2831.11,2497.72C2838.2,2490.63 2838.2,2479.12 2831.11,2472.02C2827.56,2468.47 2822.91,2466.7 2818.26,2466.7C2813.61,2466.7 2808.96,2468.47 2805.41,2472.02C2780.75,2496.69 2761.65,2525.43 2748.65,2557.47C2736.09,2588.41 2729.73,2621.09 2729.73,2654.61C2729.73,2688.13 2736.09,2720.81 2748.65,2751.75Z"
              style={{ fillRule: "nonzero" }}
            />
          </g>
          <g transform="matrix(0.704298,0,0,0.704298,-1072.88,-1317.45)">
            <path
              d="M3117.07,2654.61C3117.07,2704.32 3076.77,2744.62 3027.06,2744.62C2977.35,2744.62 2937.05,2704.32 2937.05,2654.61C2937.05,2604.9 2977.35,2564.6 3027.06,2564.6C3076.77,2564.6 3117.07,2604.9 3117.07,2654.61Z"
              style={{ fillRule: "nonzero" }}
            />
          </g>
        </g>
        <g transform="matrix(0.88783,0,0,0.88783,-2928.06,-810.384)">
          <path d="M3910.31,1231.68L3819.34,1231.68L3819.34,1028.68L3856.36,1028.68L3856.36,1203.35L3910.31,1203.35L3910.31,1231.68ZM4009.51,1028.68L4046.54,1028.68L4046.54,1231.68L4009.51,1231.68L4009.51,1028.68ZM4236.7,1028.68L4274.9,1028.68L4234.51,1231.68L4186.13,1231.68L4145.74,1028.68L4183.94,1028.68L4210.16,1192.88L4236.7,1028.68ZM4473.13,1231.68L4374.1,1231.68L4374.1,1028.68L4470.59,1028.68L4470.59,1057.01L4411.31,1057.01L4411.31,1113.41L4461.08,1113.41L4461.08,1141.74L4411.31,1141.74L4411.31,1203.35L4473.13,1203.35L4473.13,1231.68Z" />
        </g>
      </g>
    </svg>
  );
}

// A solid, square-cornered block, not just an outline mark sitting
// directly on the page background — icon+text share one color, the block
// itself is the second, separately configurable color (2026-08-29
// revision: the previous fill/text split read as broken since the mark
// has no fill of its own, so half of it could end up invisible against
// the page). No padding around the SVG and no border-radius on the
// wrapper — the mark's own sharp-edged frame IS the button's edge, so the
// two must exactly coincide rather than sit inside a visibly larger,
// rounded pill.
const DEFAULT_BACKGROUND_LIGHT = "#10140c"; // Club Ink
const DEFAULT_ICON_LIGHT = "#f3f6ec"; // Mist
const DEFAULT_BACKGROUND_DARK = "#f5f7ef"; // Moon White
const DEFAULT_ICON_DARK = "#10140c"; // Club Ink

// Replaces the old plain-text <Button>GO LIVE</Button> in PublicHeader —
// a plain next/link, not the locale-aware one, since /login is never
// locale-prefixed (same reasoning as the header's other /login link).
export function GoLiveButton() {
  const branding = useBranding();

  return (
    <NextLink href="/login" aria-label="GO LIVE" className="flex items-center">
      <span
        className="flex h-9 dark:hidden"
        style={{ backgroundColor: branding.goLiveBackgroundLight ?? DEFAULT_BACKGROUND_LIGHT }}
      >
        <GoLiveSvg color={branding.goLiveIconLight ?? DEFAULT_ICON_LIGHT} className="h-full w-auto" />
      </span>
      <span
        className="hidden h-9 dark:flex"
        style={{ backgroundColor: branding.goLiveBackgroundDark ?? DEFAULT_BACKGROUND_DARK }}
      >
        <GoLiveSvg color={branding.goLiveIconDark ?? DEFAULT_ICON_DARK} className="h-full w-auto" />
      </span>
    </NextLink>
  );
}
