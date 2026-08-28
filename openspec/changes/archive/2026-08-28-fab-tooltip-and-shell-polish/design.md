## Context

See `proposal.md` — Why. The corner FAB (variant `a`) is a plain Haven `Button`, absolutely positioned, whose own `onMouseEnter`/`onMouseLeave`/`onFocus`/`onBlur` drive a `fabHover` boolean — a scale-up transform plus a darker brand gradient inside its child `FAB` component — and an imperatively-set focus-only outline. Every other Ask-trigger placement already names itself visibly (the header action bar's icon-only circles carry a tooltip per the `action-bar` spec; the labelled-pill states carry a visible label) — the FAB was the exception, naming itself only via `aria-label`, invisible to sighted users. `agent-web` and `agent-vision` carry near-identical copies of `Shell.tsx` and the shell components touched here.

## Goals / Non-Goals

**Goals:**
- Give the FAB a visible tooltip naming it, consistent with how every other icon-only Ask-trigger control already names itself.
- Do this without breaking the FAB's existing hover-scale / gradient-darken / focus-outline behavior.
- Apply identically to `agent-web` and `agent-vision`.

**Non-Goals:**
- No change to which variant/width shows the FAB vs. the inline action — the existing `c`-variant responsive rule is untouched.
- No change to the FAB's click behavior (still opens the assistant panel).
- The implementation/visual-polish items noted in `proposal.md`'s "rode along" section are out of scope for this spec delta.

## Decisions

**Decision: Wrap the FAB's `Button` in a Haven `Tooltip`, but drive `fabHover` and the focus outline from the `Tooltip`'s `onOpen`/`onClose` rather than the `Button`'s own `onMouseEnter`/`onFocus`.**
Haven's `Tooltip` clones its own hover/focus interaction props onto its single child element via `React.cloneElement`, which *replaces* same-named props rather than composing with them. The FAB's `Button` is a plain Haven `Button`, not the shell's `HoverButton` wrapper (which explicitly chains any passed-in `onMouseEnter`/etc. with its own internal hover state) — so wrapping it as-is would have silently dropped the Button's own `onMouseEnter`/`onMouseLeave`/`onFocus`/`onBlur`, killing the hover-scale, gradient-darken, and focus outline. Verified empirically with Playwright, both that this hazard is real for a plain `Button` and that the `HoverButton`/`CircleButton`-based `Tooltip` usages elsewhere in the shell (Subnav, MainHeader, ActionBar, AssistantPanel) are unaffected, since those components already compose external handlers internally.
- Why: `Tooltip`'s `onOpen`/`onClose` fire "in both controlled and uncontrolled modes" per its own contract, driven by its internal `useHover`/`useFocus` regardless of what happens to the child's own props — the one reliable hook available without forking the component.
- Alternative considered — give `HoverButton` a way to opt out of self-tracking so it could be reused for the FAB: rejected as unnecessary; the FAB's positioning/hover-scale/gradient-darken/outline styling is bespoke enough that adapting it to `HoverButton`'s shape would be more invasive than composing through the callbacks `Tooltip` already exposes.

**Decision: Accept that the focus outline now also shows on hover.**
`onOpen`/`onClose` fire for both hover and keyboard focus, so the previously focus-only outline now also appears on mouse hover.
- Why: The FAB already gives strong hover feedback (scale + gradient darken); an outline appearing alongside that reads as consistent rather than a regression, and avoiding it would require re-deriving a separate hover-vs-focus distinction that `Tooltip` doesn't expose.
- Alternative considered — track focus separately via a `ref` and native `focus`/`blur` listeners in a `useEffect` (invisible to `Tooltip`'s `cloneElement` since it isn't a prop): rejected as more moving parts for a purely cosmetic distinction.

**Decision: Apply identically to `agent-web` and `agent-vision`.**
Same `Tooltip` wrap, same `onOpen`/`onClose` wiring, in both shells' `Shell.tsx`.
- Why: the two shells are kept in parity; a divergent FAB behavior would make the same shared link behave differently between them.

## Risks / Trade-offs

- **Hover now also shows the focus outline** — minor, intentional cosmetic change (see Decision above).
- **Any future `Tooltip`-wrapped plain `Button`** (not `HoverButton`) elsewhere in the shell would hit the same clobbering hazard. Mitigation: documented inline at the FAB call site in both `Shell.tsx` files; any component with its own hover/focus-driven behavior should route that state through `Tooltip`'s `onOpen`/`onClose` rather than the wrapped element's own handlers.

## Migration Plan

Front-end only, no data or API migration. Deployed through the normal per-shell `npm run deploy` (gh-pages overlay). Rollback is a straight revert of the `Tooltip` wrap in both `Shell.tsx` files, restoring the Button's own `onMouseEnter`/`onFocus`/`onBlur` and the imperative outline.
