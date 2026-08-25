/**
 * Icons ported 1:1 from the inline SVGs in ContentOrchestrationShell.dc.html and its
 * two Leaflet pages. Kept as local components (rather than swapped for Haven's icon
 * set) so the shell renders the exact geometry the design specifies.
 */
import type { SVGProps } from 'react'

type S = SVGProps<SVGSVGElement> & { size?: number }

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconHome({ size = 20, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 19.597" fill="currentColor" {...p}>
      <path
        fillRule="evenodd"
        d="M 18.499 5.396 L 13.123 1.096 C 11.297 -0.365 8.703 -0.365 6.877 1.096 L 1.501 5.396 C 0.552 6.155 0 7.304 0 8.519 L 0 15.597 C 0 17.806 1.791 19.597 4 19.597 L 6 19.597 C 7.105 19.597 8 18.701 8 17.597 L 8 14.597 C 8 14.045 8.448 13.597 9 13.597 L 11 13.597 C 11.552 13.597 12 14.045 12 14.597 L 12 17.597 C 12 18.701 12.895 19.597 14 19.597 L 16 19.597 C 18.209 19.597 20 17.806 20 15.597 L 20 8.519 C 20 7.304 19.448 6.155 18.499 5.396 Z M 2.751 6.958 L 8.126 2.657 C 9.222 1.781 10.778 1.781 11.874 2.657 L 17.249 6.958 C 17.724 7.337 18 7.912 18 8.519 L 18 15.597 C 18 16.701 17.105 17.597 16 17.597 L 14 17.597 L 14 14.597 C 14 12.94 12.657 11.597 11 11.597 L 9 11.597 C 7.343 11.597 6 12.94 6 14.597 L 6 17.597 L 4 17.597 C 2.895 17.597 2 16.701 2 15.597 L 2 8.519 C 2 7.912 2.276 7.337 2.751 6.958 Z"
      />
    </svg>
  )
}

/** Filled house glyph — used on the tour card tile. */
export function IconHomeFilled({ size = 22, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 19.597" fill="currentColor" {...p}>
      <path
        fillRule="evenodd"
        d="M 18.499 5.396 L 13.123 1.096 C 11.297 -0.365 8.703 -0.365 6.877 1.096 L 1.501 5.396 C 0.552 6.155 0 7.304 0 8.519 L 0 15.597 C 0 17.806 1.791 19.597 4 19.597 L 6 19.597 C 7.105 19.597 8 18.701 8 17.597 L 8 14.597 C 8 14.045 8.448 13.597 9 13.597 L 11 13.597 C 11.552 13.597 12 14.045 12 14.597 L 12 17.597 C 12 18.701 12.895 19.597 14 19.597 L 16 19.597 C 18.209 19.597 20 17.806 20 15.597 L 20 8.519 C 20 7.304 19.448 6.155 18.499 5.396 Z"
      />
    </svg>
  )
}

export function IconClients({ size = 20, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path
        fillRule="evenodd"
        d="M5 6.5a1.5 1.5 0 0 1 2.979-.252A5.516 5.516 0 0 1 9.67 5.016a3.5 3.5 0 1 0-5.782 3.815c-.512.35-.975.799-1.371 1.326-.35.466-.64.982-.87 1.531-.486 1.162-.175 2.295.529 3.087.608.684 1.508 1.124 2.476 1.21.076-.176.163-.352.261-.527A9.853 9.853 0 0 1 5.915 14H5c-.56 0-1.049-.24-1.328-.554-.257-.289-.332-.618-.179-.985a5.16 5.16 0 0 1 .625-1.104C4.811 10.433 5.68 10 6.5 10c0-.726.14-1.419.396-2.053A1.502 1.502 0 0 1 5 6.5Zm14.347 9.485a5.626 5.626 0 0 0-.261-.527A9.855 9.855 0 0 0 18.085 14H19c.56 0 1.049-.24 1.328-.554.257-.289.332-.618.178-.985a5.162 5.162 0 0 0-.624-1.104C19.189 10.433 18.32 10 17.5 10c0-.726-.14-1.418-.396-2.053A1.502 1.502 0 0 0 19 6.5a1.5 1.5 0 0 0-2.979-.252 5.515 5.515 0 0 0-1.692-1.232 3.5 3.5 0 1 1 5.782 3.815c.512.35.975.799 1.371 1.326.35.466.64.982.87 1.531.486 1.162.175 2.295-.529 3.087-.608.684-1.508 1.124-2.476 1.21ZM12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-4 2a4 4 0 1 1 6.55 3.081c.935.443 1.779 1.123 2.473 1.991.281.35.533.727.756 1.122.843 1.498.501 3.03-.427 4.112C16.455 21.35 15.014 22 13.5 22h-3c-1.514 0-2.955-.65-3.852-1.694-.928-1.082-1.27-2.614-.427-4.112.223-.395.475-.771.755-1.122.695-.868 1.539-1.548 2.473-1.99A3.992 3.992 0 0 1 8 10Zm.538 6.321C9.502 15.117 10.755 14.5 12 14.5s2.498.617 3.462 1.821c.21.263.402.549.574.854.375.668.256 1.294-.202 1.828-.49.572-1.363.997-2.334.997h-3c-.971 0-1.843-.425-2.334-.997-.458-.534-.577-1.16-.202-1.828.172-.305.364-.59.574-.854Z"
      />
    </svg>
  )
}

export function IconSearch({ size = 20, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...p}>
      <g transform="translate(2,2)">
        <path
          fillRule="evenodd"
          d="M 14.618 16.032 C 13.078 17.264 11.125 18 9 18 C 4.029 18 0 13.971 0 9 C 0 4.029 4.029 0 9 0 C 13.971 0 18 4.029 18 9 C 18 11.125 17.264 13.078 16.032 14.618 L 19.707 18.293 C 20.098 18.683 20.098 19.317 19.707 19.707 C 19.317 20.098 18.683 20.098 18.293 19.707 L 14.618 16.032 Z M 16 9 C 16 12.866 12.866 16 9 16 C 5.134 16 2 12.866 2 9 C 2 5.134 5.134 2 9 2 C 12.866 2 16 5.134 16 9 Z"
        />
      </g>
    </svg>
  )
}

export function IconCalendar({ size = 20, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path d="M 5 8 C 4.448 8 4 8.448 4 9 C 4 9.552 4.448 10 5 10 L 15 10 C 15.552 10 16 9.552 16 9 C 16 8.448 15.552 8 15 8 L 5 8 Z" />
      <path
        fillRule="evenodd"
        d="M 7 1 C 7 0.448 6.552 0 6 0 C 5.448 0 5 0.448 5 1 L 5 2 C 2.239 2 0 4.239 0 7 L 0 15 C 0 17.761 2.239 20 5 20 L 15 20 C 17.761 20 20 17.761 20 15 L 20 7 C 20 4.239 17.761 2 15 2 L 15 1 C 15 0.448 14.552 0 14 0 C 13.448 0 13 0.448 13 1 L 13 2 L 7 2 L 7 1 Z M 13 5 L 13 4 L 7 4 L 7 5 C 7 5.552 6.552 6 6 6 C 5.448 6 5 5.552 5 5 L 5 4 C 3.343 4 2 5.343 2 7 L 2 15 C 2 16.657 3.343 18 5 18 L 15 18 C 16.657 18 18 16.657 18 15 L 18 7 C 18 5.343 16.657 4 15 4 L 15 5 C 15 5.552 14.552 6 14 6 C 13.448 6 13 5.552 13 5 Z"
      />
    </svg>
  )
}

export function IconSupport({ size = 20, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path d="M 7 7 C 7 6.448 7.448 6 8 6 C 8.552 6 9 6.448 9 7 C 9 7.552 8.552 8 8 8 C 7.448 8 7 7.552 7 7 Z" />
      <path d="M 10 4 C 8.343 4 7 5.343 7 7 L 9 7 C 9 6.448 9.448 6 10 6 L 10.169 6 C 10.939 6 11.498 6.73 11.298 7.473 L 11.26 7.615 C 11.179 7.914 10.99 8.172 10.73 8.34 L 10.411 8.546 C 9.531 9.112 9 10.087 9 11.133 L 9 12 C 9 12.552 9.448 13 10 13 C 10.552 13 11 12.552 11 12 L 11 11.133 C 11 10.767 11.186 10.426 11.494 10.227 L 11.813 10.022 C 12.49 9.585 12.981 8.913 13.191 8.135 L 13.229 7.994 C 13.772 5.98 12.255 4 10.169 4 L 10 4 Z" />
      <path d="M 9 15 C 9 14.448 9.448 14 10 14 C 10.552 14 11 14.448 11 15 C 11 15.552 10.552 16 10 16 C 9.448 16 9 15.552 9 15 Z" />
      <path
        fillRule="evenodd"
        d="M 10 20 C 15.523 20 20 15.523 20 10 C 20 4.477 15.523 0 10 0 C 4.477 0 0 4.477 0 10 C 0 15.523 4.477 20 10 20 Z M 10 18 C 14.418 18 18 14.418 18 10 C 18 5.582 14.418 2 10 2 C 5.582 2 2 5.582 2 10 C 2 14.418 5.582 18 10 18 Z"
      />
    </svg>
  )
}

export function IconBell({ size = 20, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 19.689 20" fill="currentColor" {...p}>
      <path
        fillRule="evenodd"
        d="M 9.844 0 C 5.426 0 1.844 3.582 1.844 8 L 1.844 9.649 L 0.663 11.126 C -0.908 13.09 0.49 16 3.006 16 L 16.683 16 C 19.199 16 20.597 13.09 19.026 11.126 L 17.844 9.649 L 17.844 8 C 17.844 3.582 14.263 0 9.844 0 Z M 3.844 8 C 3.844 4.686 6.531 2 9.844 2 C 13.158 2 15.844 4.686 15.844 8 L 15.844 10.351 L 17.464 12.375 C 17.988 13.03 17.522 14 16.683 14 L 3.006 14 C 2.167 14 1.701 13.03 2.225 12.375 L 3.844 10.351 L 3.844 8 Z"
      />
      <path d="M 7.723 17.121 C 7.333 16.731 6.699 16.731 6.309 17.121 C 5.918 17.512 5.918 18.145 6.309 18.536 C 6.773 19 7.324 19.368 7.931 19.619 C 8.538 19.871 9.188 20 9.844 20 C 10.501 20 11.151 19.871 11.758 19.619 C 12.364 19.368 12.916 19 13.38 18.536 C 13.77 18.145 13.77 17.512 13.38 17.121 C 12.989 16.731 12.356 16.731 11.966 17.121 C 11.687 17.4 11.356 17.621 10.992 17.772 C 10.628 17.922 10.238 18 9.844 18 C 9.45 18 9.06 17.922 8.696 17.772 C 8.332 17.621 8.002 17.4 7.723 17.121 Z" />
    </svg>
  )
}

export function IconChat({ size = 20, ...p }: S) {
  return (
    <svg width={size} height={(size * 18) / 20} viewBox="0 0 20 18" fill="currentColor" {...p}>
      <path
        fillRule="evenodd"
        d="M 3.182 2.367 C 3.141 2.396 3.099 2.429 3.055 2.466 C 1.232 4.016 0 6.242 0 8.794 C 0 10.679 0.674 12.38 1.757 13.763 C 1.09 13.988 0.572 14.557 0.432 15.278 C 0.252 16.211 0.751 17.141 1.628 17.506 C 2.408 17.83 3.244 17.998 4.089 18 L 4.095 18 C 5.21 18 6.229 17.7 7.108 17.216 C 8.051 17.47 9.025 17.599 10.004 17.6 L 10.006 17.6 C 15.215 17.6 20 13.943 20 8.794 C 20 3.64 15.21 0 10.005 0 C 8.011 0 6.138 0.512 4.555 1.419 M 4.921 3.542 C 5.121 3.402 5.333 3.278 5.549 3.154 C 6.294 2.728 7.125 2.406 8.016 2.212 C 8.652 2.073 9.318 2 10.005 2 C 14.423 2 18 5.038 18 8.794 C 18 12.55 14.424 15.6 10.006 15.6 C 8.913 15.599 7.829 15.403 6.806 15.023 C 6.498 15.268 6.16 15.476 5.797 15.636 C 5.275 15.868 4.703 16 4.095 16 C 3.511 15.998 2.934 15.882 2.396 15.659 C 3.144 15.651 3.781 15.215 4.095 14.582 C 4.096 14.579 4.097 14.576 4.099 14.574 C 4.187 14.394 4.249 14.198 4.28 13.992 C 4.296 13.89 4.304 13.786 4.304 13.681 C 4.304 13.643 4.299 13.589 4.293 13.539 C 2.882 12.314 2 10.645 2 8.794 C 2 6.917 2.903 5.221 4.351 3.99 C 4.354 3.987 4.358 3.985 4.363 3.984 C 4.367 3.982 4.371 3.981 4.374 3.978 C 4.551 3.828 4.728 3.679 4.921 3.542 Z"
      />
    </svg>
  )
}

/*
 * There is deliberately no bare three-dot icon here. A ⋯ in this shell always means an
 * overflow menu, so the glyph is only reachable through `Menu` (via `IconMenuDots` below) —
 * exporting it loose is what let inert copies of it appear in the subnav's rows.
 */

export function IconPlus({ size = 15, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

export function IconClose({ size = 12, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 12.655 12.665" fill="currentColor" {...p}>
      <path d="M 12.362 1.707 C 12.752 1.316 12.752 0.683 12.361 0.293 C 11.971 -0.098 11.337 -0.097 10.947 0.293 L 6.327 4.917 L 1.707 0.293 C 1.317 -0.097 0.684 -0.098 0.293 0.293 C -0.097 0.683 -0.098 1.316 0.293 1.707 L 4.914 6.332 L 0.293 10.958 C -0.098 11.348 -0.097 11.982 0.293 12.372 C 0.684 12.762 1.317 12.762 1.707 12.371 L 6.327 7.747 L 10.947 12.371 C 11.338 12.762 11.971 12.762 12.361 12.372 C 12.752 11.982 12.752 11.348 12.362 10.958 L 7.741 6.332 L 12.362 1.707 Z" />
    </svg>
  )
}

export function IconChevronRight({ size = 12, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2.4} {...stroke} {...p}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export function IconHamburger({ size = 18, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

export function IconFlame({ size = 16, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" {...p}>
      <path d="M12.2857 4.7543C12.228 4.70992 12.14 4.76183 12.1583 4.82843C12.8791 7.44537 11.0589 9.51841 10.2275 9.15029C9.7775 8.95029 9.83 8.29316 9.83 8.29316C10.0088 6.89557 9.89674 5.47804 9.5 4.12177C9.19185 3.21681 8.6443 2.40264 7.91 1.75751C7.6366 1.47955 7.32393 1.24063 6.9818 1.04723C6.73911 0.910043 6.4465 1.0903 6.42459 1.34907C6.35752 2.14112 6.05535 2.903 5.5475 3.5432C5.21222 4.03125 4.83863 4.49448 4.43 4.9289C3.35 6.09318 2 7.54316 2 9.67886C2 12.1051 4.05998 14.3744 6.61621 14.9975C6.69644 15.0171 6.75004 14.9157 6.69047 14.8632C6.30232 14.5207 6.04303 14.0616 5.96 13.5574C5.96 13.5574 5.52018 11.9157 7.11043 9.5587C7.15059 9.49918 7.26889 9.52335 7.28498 9.5916C7.38084 9.99813 7.73932 10.8745 9.08 11.7431C9.68369 12.1023 10.0493 12.7335 10.0462 13.4114C10.0437 13.9669 9.79399 14.4889 9.37 14.8543C9.30876 14.907 9.36271 15.0155 9.44451 14.9965C12.049 14.3926 14 12.0984 14 9.67886C14 8.36032 13.5714 7.13523 13.5714 7.13523C13.5714 7.13523 13.034 5.3433 12.2857 4.7543Z" />
    </svg>
  )
}

export function IconChart({ size = 17, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M18.505 6.137a1 1 0 0 1 .358 1.368l-4.138 7.071a1 1 0 0 1-1.358.364l-3.349-1.907-3.2 4.543a1 1 0 0 1-1.635-1.152l3.724-5.286a1 1 0 0 1 1.312-.293l3.28 1.868 3.638-6.218a1 1 0 0 1 1.368-.358Z" />
      <path
        fillRule="evenodd"
        d="M2 6a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V6Zm4-2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6Z"
      />
    </svg>
  )
}

export function IconStar({ size = 17, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 19.832 19.15" fill="currentColor" {...p}>
      <path
        fillRule="evenodd"
        d="M 13.738 6.594 C 13.086 6.5 12.523 6.091 12.232 5.5 L 10.765 2.528 C 10.417 1.824 9.414 1.824 9.067 2.528 L 7.6 5.5 C 7.309 6.091 6.746 6.5 6.094 6.594 L 2.813 7.071 C 2.037 7.184 1.727 8.138 2.289 8.685 L 4.663 10.999 C 5.134 11.459 5.349 12.121 5.238 12.77 L 4.678 16.037 C 4.545 16.81 5.357 17.4 6.051 17.035 L 8.985 15.492 C 9.568 15.186 10.264 15.186 10.847 15.492 L 13.781 17.035 C 14.475 17.4 15.287 16.81 15.154 16.037 L 14.594 12.77 C 14.482 12.121 14.697 11.459 15.169 10.999 L 17.543 8.685 C 18.105 8.138 17.795 7.184 17.018 7.071 L 13.738 6.594 Z M 14.025 4.615 L 12.558 1.642 C 11.477 -0.547 8.355 -0.547 7.274 1.642 L 5.807 4.615 L 2.526 5.092 C 0.109 5.443 -0.856 8.413 0.893 10.118 L 3.267 12.432 L 2.707 15.699 C 2.294 18.106 4.82 19.941 6.982 18.805 L 9.916 17.262 L 12.85 18.805 C 15.012 19.941 17.538 18.106 17.125 15.699 L 16.565 12.432 L 18.939 10.118 C 20.688 8.413 19.723 5.443 17.306 5.092 L 14.025 4.615 Z"
      />
    </svg>
  )
}

/** The four-point RealAssist+ spark. */
export function IconSpark({ size = 15, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor" {...p}>
      <path d="M16.5611 0C16.3791 0 16.182 0 16 0C15.818 0 15.6209 0 15.4389 0C15.4389 8.52323 8.52323 15.4389 0 15.4389C0 15.6209 0 15.818 0 16C0 16.182 0 16.3791 0 16.5611C8.52323 16.5611 15.4389 23.4768 15.4389 32C15.6209 32 15.818 32 16 32C16.182 32 16.3791 32 16.5611 32C16.5611 23.4768 23.4768 16.5611 32 16.5611C32 16.3791 32 16.182 32 16C32 15.818 32 15.6209 32 15.4389C23.4768 15.4389 16.5611 8.52323 16.5611 0Z" />
    </svg>
  )
}

export function IconSort({ size = 16, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <path d="m3 16 4 4 4-4" />
      <path d="M7 20V4" />
      <path d="m21 8-4-4-4 4" />
      <path d="M17 4v16" />
    </svg>
  )
}

export function IconMapView({ size = 16, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3Z" />
      <path d="M9 3v15" />
      <path d="M15 6v15" />
    </svg>
  )
}

export function IconGridView({ size = 15, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function IconTableView({ size = 15, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M10 10v10" />
    </svg>
  )
}

export function IconPencil({ size = 13, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  )
}

export function IconCompose({ size = 16, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </svg>
  )
}

export function IconTrash({ size = 13, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

export function IconExpandPanel({ size = 14, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  )
}

export function IconCollapsePanel({ size = 14, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <path d="M4 14h6v6" />
      <path d="M20 10h-6V4" />
      <path d="M14 10l7-7" />
      <path d="M3 21l7-7" />
    </svg>
  )
}

export function IconSend({ size = 15, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2.2} {...stroke} {...p}>
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  )
}

/**
 * Paper plane — "send this listing to a client", the middle action on a listing card.
 * Distinct from `IconSend`, which is the chat composer's submit arrow.
 */
export function IconShare({ size = 15, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.7} {...stroke} {...p}>
      <path d="M21.5 2.5 2.8 9.4a.5.5 0 0 0-.05.92l7.3 3.63 3.63 7.3a.5.5 0 0 0 .92-.05Z" />
      <path d="M21.5 2.5 10.05 13.95" />
    </svg>
  )
}

/**
 * The save affordance on a listing card. Haven ships no icon set and the shell's own
 * set had no heart, so this is drawn to the same 24-box grid as the other stroke icons.
 * `filled` is the saved state — the screenshot shows a solid heart on saved cards.
 */
export function IconHeart({ size = 15, filled = false, ...p }: S & { filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      {...stroke}
      {...(filled ? { fill: 'currentColor' } : null)}
      {...p}
    >
      <path d="M12 20.6 3.9 12.5a5.1 5.1 0 0 1 0-7.2 5.1 5.1 0 0 1 7.2 0l.9.9.9-.9a5.1 5.1 0 0 1 7.2 0 5.1 5.1 0 0 1 0 7.2Z" />
    </svg>
  )
}

/** Down arrow beside a reduced price, as on the price-drop pill. */
export function IconArrowDown({ size = 11, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2.6} {...stroke} {...p}>
      <path d="M12 4v16" />
      <path d="M19 13l-7 7-7-7" />
    </svg>
  )
}

/**
 * RealAssist+ mark — ported from components/FAB.jsx (figma node 21:212).
 * `aura` is omitted; the shell mounts it with aura=false.
 *
 * The artwork is 20 units square sitting 2 units in from each edge of a 24-unit box, which
 * is why the viewBox is 24 and the paths are shifted rather than starting at the origin.
 * The port originally hardcoded a 20px svg inside a `size`-square clipping div, so anything
 * below 24 sheared the right and bottom points off the star instead of scaling it — the
 * viewBox does that scaling, and the same markup is duplicated in `public/search-map.html`
 * and `public/tours-map.html`, which cannot import this module.
 */
export function IconRealAssist({ size = 24, ...p }: { size?: number; className?: string }) {
  return (
    <svg
      className={p.className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      // The callers lay this out in a flex row; a block box keeps it off the text baseline.
      style={{ display: 'block', flex: 'none' }}
    >
      <g transform="translate(2, 2)">
        <path
          d="M 10.351 0 C 10.351 5.327 14.673 9.649 20 9.649 L 20 10.351 C 14.673 10.351 10.351 14.673 10.351 20 L 9.649 20 C 9.649 14.673 5.327 10.351 0 10.351 L 0 9.649 C 5.327 9.649 9.649 5.327 9.649 0 L 10.351 0 Z"
          fill="currentColor"
          fillRule="evenodd"
        />
        <path
          d="M 17.024 13.27 C 17.024 14.864 18.315 16.165 19.92 16.165 L 19.92 16.375 C 18.326 16.375 17.025 17.665 17.024 19.27 L 16.815 19.27 C 16.815 17.675 15.525 16.375 13.92 16.375 L 13.92 16.165 C 15.514 16.165 16.815 14.874 16.815 13.27 L 17.024 13.27 Z"
          fill="currentColor"
          fillRule="evenodd"
        />
        <path
          d="M 16.92 2.899 C 17.472 2.899 17.92 3.347 17.92 3.899 C 17.92 4.452 17.472 4.899 16.92 4.899 C 16.368 4.899 15.92 4.452 15.92 3.899 C 15.92 3.347 16.368 2.899 16.92 2.899 Z"
          fill="currentColor"
          fillRule="evenodd"
        />
      </g>
    </svg>
  )
}

/* ---------------------------------------------------------------------------
 * Capability-menu glyphs. The assistant's home state lists what RealAssist+ can
 * do, one outline icon per card. Drawn to the same 24-box stroke grid as the
 * other line icons here so they sit consistently at ~20px.
 * ------------------------------------------------------------------------- */

/** Add Client — a person with a plus. */
export function IconUserPlus({ size = 20, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <circle cx="9" cy="7" r="3.4" />
      <path d="M2.6 20v-1a5.4 5.4 0 0 1 5.4-5.4h1.5" />
      <path d="M18 8.5v5" />
      <path d="M15.5 11h5" />
    </svg>
  )
}

/** Catch Up — a person with a circular refresh arrow, for the daily briefing. */
export function IconCatchUp({ size = 20, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <circle cx="8.5" cy="7" r="3.2" />
      <path d="M2.6 20v-1a5.2 5.2 0 0 1 5.2-5.2h1" />
      <path d="M20.4 8.6a4 4 0 0 0-6.8-2.2" />
      <path d="M13.2 3.4v3h3" />
      <path d="M13.6 15.4a4 4 0 0 0 6.8 2.2" />
      <path d="M20.8 20.6v-3h-3" />
    </svg>
  )
}

/** Check Listing Status — a check inside a circle. */
export function IconCircleCheck({ size = 20, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.3 12.4l2.6 2.6 4.8-5.4" />
    </svg>
  )
}

/** Manage Client Notes — a note with lines and a folded corner. */
export function IconNote({ size = 20, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <path d="M4 6a2 2 0 0 1 2-2h8l6 6v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M14 4v4a2 2 0 0 0 2 2h4" />
      <path d="M8 13h6" />
      <path d="M8 16.5h4" />
    </svg>
  )
}

/** Search Optimization — a magnifier with a sparkle. */
export function IconSearchSpark({ size = 20, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <circle cx="10" cy="11" r="6" />
      <path d="M18.5 19.5 15 16" />
      <path d="M18.6 3.2l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9L16 5.8l1.9-.7Z" />
    </svg>
  )
}

/** Coordinate Tour — a calendar with a clock, for showings on a timeline. */
export function IconCalendarClock({ size = 20, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <path d="M20 10.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6.5" />
      <path d="M7.5 2.5v3" />
      <path d="M15.5 2.5v3" />
      <path d="M3 9h17" />
      <circle cx="17.5" cy="17.5" r="4" />
      <path d="M17.5 15.8v1.9l1.3.9" />
    </svg>
  )
}

/** The composer's send arrow on the home state — an outline paper-plane. */
export function IconComposerSend({ size = 18, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <path d="M21 3 10.5 13.5" />
      <path d="M21 3l-6.7 18-3.8-8.2L2.3 9.2Z" />
    </svg>
  )
}

/** Export / open-out glyph — ported from the tours-map header's "Export" pill. */
export function IconExport({ size = 14, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  )
}

/** Bookmark glyph — ported from the search-map header's "Save search" pill. */
export function IconBookmark({ size = 14, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

/** Plain chevron-down — the MLS selector's caret in the Search header. */
export function IconChevronDown({ size = 12, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2.5} {...stroke} {...p}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

/**
 * Subnav toggle — a left rule beside descending list lines. From IconSubnav.zip; carries
 * both the 24px and the 16px-tuned geometry and picks by size (sm at 16 and below).
 */
export function IconSubnav({ size = 16, ...p }: S) {
  const sm = size <= 16
  return (
    <svg width={size} height={size} viewBox={sm ? '0 0 16 16' : '0 0 24 24'} fill="currentColor" {...p}>
      {sm ? (
        <path d="M1.75 1a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-1.5 0V1.75A.75.75 0 0 1 1.75 1m12.5 3a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1 0-1.5zm0 3.25a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1 0-1.5zm-5.5 3.25a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1 0-1.5z" />
      ) : (
        <path d="M3 2a1 1 0 0 1 1 1v18a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1m18 5a1 1 0 1 1 0 2H7a1 1 0 1 1 0-2zm0 4a1 1 0 1 1 0 2H7a1 1 0 1 1 0-2zm-9 4a1 1 0 1 1 0 2H7a1 1 0 1 1 0-2z" />
      )}
    </svg>
  )
}

/**
 * Panel-open — a right rule with a chevron pointing into it, the "reveal the panel" affordance.
 * From IconPanel.zip; picks the 16px-tuned geometry at size 16 and below, the 24px otherwise.
 */
export function IconPanelOpen({ size = 20, ...p }: S) {
  const sm = size <= 16
  return (
    <svg width={size} height={size} viewBox={sm ? '0 0 16 16' : '0 0 24 24'} fill="currentColor" {...p}>
      {sm ? (
        <path d="M3.72 3.47a.75.75 0 0 1 1.06 0l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 1 1-1.06-1.06L7.19 8 3.72 4.53a.75.75 0 0 1 0-1.06M11 1.75a.75.75 0 1 1 1.5 0v12.5a.75.75 0 0 1-1.5 0z" />
      ) : (
        <path d="M6.793 6.293a1 1 0 0 1 1.414 0l5 5a1 1 0 0 1 0 1.414l-5 5a1 1 0 1 1-1.414-1.414L11.086 12 6.793 7.707a1 1 0 0 1 0-1.414M15.5 3a1 1 0 1 1 2 0v18a1 1 0 1 1-2 0z" />
      )}
    </svg>
  )
}

/**
 * Panel-close — a left rule with a chevron pointing out of it, the "collapse the panel"
 * affordance. From IconPanel.zip; picks the 16px-tuned geometry at size 16 and below.
 */
export function IconPanelClose({ size = 16, ...p }: S) {
  const sm = size <= 16
  return (
    <svg width={size} height={size} viewBox={sm ? '0 0 16 16' : '0 0 24 24'} fill="currentColor" {...p}>
      {sm ? (
        <path d="M3.5 14.25a.75.75 0 0 0 1.5 0V1.75a.75.75 0 0 0-1.5 0zm8.78-1.72a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 1 1 1.06 1.06L8.81 8l3.47 3.47a.75.75 0 0 1 0 1.06" />
      ) : (
        <path d="M6.5 3a1 1 0 0 1 2 0v18a1 1 0 1 1-2 0zm10.707 3.293a1 1 0 0 0-1.414 0l-5 5a1 1 0 0 0 0 1.414l5 5a1 1 0 1 0 1.414-1.414L12.914 12l4.293-4.293a1 1 0 0 0 0-1.414" />
      )}
    </svg>
  )
}

/** Three-dot menu toggle glyph — ported from components/Menu.jsx. */
export function IconMenuDots(p: SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={5} viewBox="0 0 22 6" fill="currentColor" {...p}>
      <path
        fillRule="evenodd"
        d="M 3 6 C 4.657 6 6 4.657 6 3 C 6 1.343 4.657 0 3 0 C 1.343 0 0 1.343 0 3 C 0 4.657 1.343 6 3 6 Z M 2 3 C 2 2.448 2.448 2 3 2 C 3.552 2 4 2.448 4 3 C 4 3.552 3.552 4 3 4 C 2.448 4 2 3.552 2 3 Z"
      />
      <path
        fillRule="evenodd"
        d="M 14 3 C 14 4.657 12.657 6 11 6 C 9.343 6 8 4.657 8 3 C 8 1.343 9.343 0 11 0 C 12.657 0 14 1.343 14 3 Z M 11 2 C 10.448 2 10 2.448 10 3 C 10 3.552 10.448 4 11 4 C 11.552 4 12 3.552 12 3 C 12 2.448 11.552 2 11 2 Z"
      />
      <path
        fillRule="evenodd"
        d="M 22 3 C 22 4.657 20.657 6 19 6 C 17.343 6 16 4.657 16 3 C 16 1.343 17.343 0 19 0 C 20.657 0 22 1.343 22 3 Z M 19 2 C 18.448 2 18 2.448 18 3 C 18 3.552 18.448 4 19 4 C 19.552 4 20 3.552 20 3 C 20 2.448 19.552 2 19 2 Z"
      />
    </svg>
  )
}

/* ---------------------------------------------------------------------------
 * Lead-detail glyphs. The lead detail page's contact row, call-recording player
 * and Realtor.com contact-log card need a small set of line icons not otherwise
 * used in the shell. Drawn to the same 24-box stroke grid as the icons above.
 * ------------------------------------------------------------------------- */

/** Phone handset — the contact row and the "Total calls" tally. */
export function IconPhone({ size = 15, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <path d="M15.5 3.5A5 5 0 0 1 20.5 8.5" />
      <path d="M15.5 7A1.5 1.5 0 0 1 17 8.5" />
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h2.6a1.5 1.5 0 0 1 1.48 1.26l.6 3.2a1.5 1.5 0 0 1-.42 1.32l-1.3 1.3a13 13 0 0 0 5.14 5.14l1.3-1.3a1.5 1.5 0 0 1 1.32-.42l3.2.6A1.5 1.5 0 0 1 20 17.9v2.6A1.5 1.5 0 0 1 18.5 22 15.5 15.5 0 0 1 4 5.5Z" />
    </svg>
  )
}

/** Envelope — the contact row's email link. */
export function IconMail({ size = 15, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  )
}

/** Globe — the contact row's delivery-channel marker. */
export function IconGlobe({ size = 15, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
    </svg>
  )
}

/** Filled play triangle — the call-recording player's transport button. */
export function IconPlay({ size = 14, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M7 4.5v15a1 1 0 0 0 1.52.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5Z" />
    </svg>
  )
}

/** Speaker with waves — the call-recording player's volume control. */
export function IconVolume({ size = 15, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <path d="M11 5 6.5 8.5H3v7h3.5L11 19Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  )
}

/** Circled "i" — the contact-log card's info affordance. */
export function IconInfo({ size = 15, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.6h.01" />
    </svg>
  )
}

/** Tray with a down arrow — the call-recording player's download control. */
export function IconDownload({ size = 15, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <path d="M12 3v11" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 20h16" />
    </svg>
  )
}

/** Adjustments/sliders glyph — the Leads table's "Filters" button. */
export function IconFilters({ size = 15, ...p }: S) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...p}>
      <path d="M4 6h10" />
      <path d="M18 6h2" />
      <circle cx="16" cy="6" r="2" />
      <path d="M4 18h2" />
      <path d="M10 18h10" />
      <circle cx="8" cy="18" r="2" />
    </svg>
  )
}
