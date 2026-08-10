/**
 * The agent's headshot — the one identity mark shown in both navs (the desktop rail's footer
 * and the mobile tab bar's Account tab). Shared so the two cannot drift: the same photo, the
 * same initials fallback, sized to each host.
 *
 * The photo and its fallback are siblings so the `onError` handler can swap to the initials
 * with plain DOM, without either nav owning the fallback logic.
 */
import { C, DISPLAY_FONT } from '../theme'
import { AGENT_AVATAR, AGENT_FULL_NAME, AGENT_INITIALS } from '../data'

interface AccountAvatarProps {
  /** Diameter of the disc, in px. */
  size: number
}

export function AccountAvatar({ size }: AccountAvatarProps) {
  // Initials scale with the disc: legible at the rail's 30px and the tab bar's 20px alike.
  const fontSize = Math.round(size * 0.38)
  const disc = {
    width: size,
    height: size,
    flex: 'none',
    borderRadius: '50%',
  } as const

  return (
    <>
      <img
        src={AGENT_AVATAR}
        alt={AGENT_FULL_NAME}
        style={{
          ...disc,
          objectFit: 'cover',
          // A tinted disc behind the photo, so a slow or failed load still reads as an avatar.
          background: C.border,
        }}
        onError={(e) => {
          // Fall back to initials if the headshot cannot be fetched.
          const img = e.currentTarget
          img.style.display = 'none'
          const initials = img.nextElementSibling as HTMLElement | null
          if (initials) initials.style.display = 'flex'
        }}
      />
      <span
        aria-hidden
        style={{
          ...disc,
          display: 'none',
          background: C.border,
          color: C.action,
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: DISPLAY_FONT,
          fontWeight: 600,
          fontSize,
        }}
      >
        {AGENT_INITIALS}
      </span>
    </>
  )
}
