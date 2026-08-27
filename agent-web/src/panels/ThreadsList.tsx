/**
 * Threads list. Rendered twice by the push panel: inline in the 300px dock when the panel
 * is expanded, and as a sliding overlay when it isn't.
 */
import { IconArrowLeft } from '@rdc-npm/rdc-ui-v4'
import { C } from '../theme'
import { CircleButton, EmptyNote, Heading, HoverDiv, HoverButton, SearchField, truncationTitle } from '../components/primitives'
import { IconClose, IconCompose, IconPencil, IconTrash } from '../icons'
import type { Thread } from '../data'

interface ThreadsListProps {
  threads: Thread[]
  query: string
  onQuery: (v: string) => void
  onClose: () => void
  onNewChat: () => void
  /**
   * Lead the header with a back arrow instead of trailing it with a close ✕. Set for the
   * sliding overlay (panel docked, not expanded), where the list covers the panel's own
   * toolbar, so "back" is the honest affordance — it returns to the conversation. The inline
   * dock (expanded) keeps the ✕, since the toolbar stays visible beside it.
   */
  back?: boolean
}

export function ThreadsList({ threads, query, onQuery, onClose, onNewChat, back = false }: ThreadsListProps) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 12px 20px' }}>
        {back && (
          <CircleButton
            onClick={onClose}
            hoverBg={C.border}
            aria-label="Back"
            title="Back"
            style={{ flex: 'none' }}
          >
            <IconArrowLeft size={2} />
          </CircleButton>
        )}
        <Heading style={{ flex: 1, whiteSpace: 'nowrap' }}>Threads</Heading>
        {!back && (
          <CircleButton onClick={onClose} hoverBg={C.border} aria-label="Close threads" title="Close threads">
            <IconClose />
          </CircleButton>
        )}
      </div>

      <div
        className="ra-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          margin: '0 12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <HoverButton
          onClick={onNewChat}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 36,
            flex: 'none',
            padding: '0 12px',
            marginBottom: 8,
            borderRadius: 40,
            border: `1px solid ${C.action}`,
            background: C.action,
            color: C.white,
            fontSize: undefined,
            fontWeight: undefined,
            cursor: 'pointer',
            transition: 'background 120ms',
          }}
          hoverStyle={{ background: C.dark }}
        >
          <IconCompose size={16} />
          New thread
        </HoverButton>

        {/* <SearchField
          value={query}
          onChange={onQuery}
          placeholder="Search threads"
          height={34}
          fontSize={12.5}
          iconSize={13}
          style={{ marginBottom: 8 }}
        /> */}

        {threads.map((t) => (
          <HoverDiv
            key={t.title}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flex: 'none',
              borderRadius: 12,
              transition: 'background 120ms',
            }}
            hoverStyle={{ background: C.border }}
          >
            <HoverButton
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 2,
                flex: 1,
                minWidth: 0,
                padding: '9px 0 9px 12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: C.dark,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
                ref={truncationTitle(t.title)}
              >
                {t.title}
              </span>
              <span style={{ fontSize: 11, color: C.muted }}>{t.when}</span>
            </HoverButton>
            <CircleButton hoverBg={C.threadIconHover} aria-label="Edit thread" title="Edit thread">
              <IconPencil />
            </CircleButton>
            <CircleButton
              hoverBg={C.threadIconHover}
              aria-label="Delete thread"
              title="Delete thread"
              style={{ marginRight: 6 }}
            >
              <IconTrash />
            </CircleButton>
          </HoverDiv>
        ))}

        {threads.length === 0 && <EmptyNote>No threads match your search.</EmptyNote>}
      </div>
    </>
  )
}
