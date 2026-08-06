import React, { useState } from 'react'
import {
  SideNavigation,
  SideNavigationItem,
  SideNavigationGroup,
  Breadcrumbs,
  Tabs,
  Avatar,
  Button,
  Link,
} from '@rdc-npm/rdc-ui-v4'
import {
  IconHome,
  IconUsers,
  IconList,
  IconListingStatus,
  IconPhone,
  IconEmail,
  IconLocation,
  IconChevronDown,
  IconFilter,
} from '@rdc-npm/rdc-ui-v4/illustrations'
import { LogoRealtorProDefault } from '@rdc-npm/rdc-ui-v4/illustrations'
import { css } from 'styled-system/css'
import { hstack, vstack } from 'styled-system/patterns'

// ─── Navigation model ──────────────────────────────────────────────────────────
// Top-level items and expandable groups for the client-web sidebar.
// Replace / extend with your prototype's navigation.

const HEADER_HEIGHT = '56px'
const SIDEBAR_WIDTH = '240px'   // expanded (on hover)
const RAIL_WIDTH = '64px'       // collapsed, icon-only (default)

// ─── Prototype content slot ─────────────────────────────────────────────────────
// The AgentDetail screen below is the default surface (mirrors an agent profile
// page). Swap it out — or route on `activePage` — for your own prototype content.

// Dummy contact details. The phone number uses the 555-01xx block reserved for
// fictional use, and the email a domain reserved by RFC 2606 — neither can reach a
// real person if a user-testing participant tries them.
const CONTACT = [
  { Icon: IconPhone, label: '(512) 555-0142' },
  { Icon: IconEmail, label: 'ali.michalo@example.com' },
  { Icon: IconLocation, label: 'Austin, TX' },
]

const TABS = [
  { value: 'proposal', label: 'Proposal templates' },
  { value: 'routing', label: 'Lead routing' },
  { value: 'performance', label: 'Performance' },
]

function AgentDetailScreen() {
  return (
    <div className={vstack({ alignItems: 'stretch', gap: '500', maxW: '960px' })}>
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[
          { text: 'Agents', href: '#' },
          { text: 'Alexandra Michalo' },
        ]}
      />

      {/* Agent identity */}
      <div className={hstack({ gap: '300', alignItems: 'center' })}>
        <Avatar size="sm" imgAlt="Alexandra Michalo" />
        <h1 className={css({ textStyle: 'headingLg', fontWeight: 'bold', color: 'text.base' })}>
          Alexandra Michalo
        </h1>
      </div>

      {/* Contact row */}
      <div className={hstack({ gap: '600', flexWrap: 'wrap', color: 'text.alternate' })}>
        {CONTACT.map(({ Icon, label }) => (
          <span key={label} className={hstack({ gap: '200', alignItems: 'center', textStyle: 'bodySm' })}>
            <Icon className={css({ w: '400', h: '400' })} />
            {label}
          </span>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="performance">
        <Tabs.List>
          {TABS.map(t => (
            <Tabs.Trigger key={t.value} value={t.value}>
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {TABS.map(t => (
          <Tabs.Content key={t.value} value={t.value}>
            {/* Filter row — representative controls; extend with real FilterDropdown menus */}
            <div className={hstack({ gap: '300', flexWrap: 'wrap', mt: '500' })}>
              <Button styleType="Secondary" size="sm" endIcon={<IconChevronDown />}>
                Market VIP
              </Button>
              <Button styleType="Secondary" size="sm" endIcon={<IconChevronDown />}>
                Last 30 days
              </Button>
              <Button styleType="Secondary" size="sm" startIcon={<IconFilter />}>
                More filters
              </Button>
            </div>

            {/* ▼ Build your prototype content for this tab below ▼ */}
            <div className={css({ minH: '360px' })} />
          </Tabs.Content>
        ))}
      </Tabs>
    </div>
  )
}

// ─── Footer ─────────────────────────────────────────────────────────────────────

const FOOTER_PRIMARY = ['About us', 'Media room']
const FOOTER_SECONDARY = ['Ad Choices', 'Privacy / Website terms of use', 'Do not sell my personal information']

function ShellFooter() {
  return (
    <footer className={vstack({ alignItems: 'stretch', gap: '300', mt: '900', pt: '600', maxW: '960px' })}>
      <div className={hstack({ gap: '500', flexWrap: 'wrap' })}>
        {FOOTER_PRIMARY.map(l => (
          <Link key={l} href="#" size="inline">{l}</Link>
        ))}
      </div>
      <div className={hstack({ gap: '500', flexWrap: 'wrap' })}>
        {FOOTER_SECONDARY.map(l => (
          <Link key={l} href="#" size="inline">{l}</Link>
        ))}
      </div>
      <p className={css({ textStyle: 'bodySm', color: 'text.disabled', maxW: '720px' })}>
        © 1995–2024 National Association of REALTORS® and Move, Inc. All rights reserved.
        Realtor.com® is the official site of the National Association of REALTORS® and is
        operated by Move, Inc., a subsidiary of News Corp.
      </p>
    </footer>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export default function Shell() {
  const [activePage, setActivePage] = useState('team.agents')
  const [teamOpen, setTeamOpen] = useState(true)
  const [leadsOpen, setLeadsOpen] = useState(false)
  const [listingsOpen, setListingsOpen] = useState(false)
  const [railExpanded, setRailExpanded] = useState(false)

  return (
    <div className={css({ minW: '1024px', minH: '100vh', bg: 'bg.base' })}>

      {/* ── Fixed top bar ── */}
      <header
        style={{ position: 'fixed', top: 0, left: 0, right: 0, height: HEADER_HEIGHT }}
        className={css({
          bg: 'bg.base', borderBottomWidth: '100', borderColor: 'border.base',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: '600', zIndex: 'navbar.fixed',
        })}
      >
        <Link href="#" aria-label="realtor.com PRO home" underline="none" className={css({ display: 'flex', alignItems: 'center' })}>
          <LogoRealtorProDefault className={css({ h: '24px', w: 'auto', display: 'block' })} />
        </Link>
        <Avatar size="sm" imgAlt="Account" />
      </header>

      {/* ── Fixed left sidebar (icon-only rail; expands on hover) ── */}
      <aside
        onMouseEnter={() => setRailExpanded(true)}
        onMouseLeave={() => setRailExpanded(false)}
        style={{
          position: 'fixed', top: HEADER_HEIGHT, left: 0, bottom: 0,
          width: railExpanded ? SIDEBAR_WIDTH : RAIL_WIDTH,
          transition: 'width 160ms ease',
        }}
        className={css({
          bg: 'bg.alternate', borderRightWidth: '100', borderColor: 'border.base',
          overflowX: 'hidden', overflowY: 'auto', zIndex: 'navbar.default', pt: '300',
          // When collapsed: hide text labels and group arrow toggles, leaving icons only.
          '& .button-text': railExpanded
            ? { opacity: 1, transition: '[opacity 120ms ease]' }
            : { opacity: 0, whiteSpace: 'nowrap' },
          '& .nav-arrow-button': railExpanded ? {} : { display: 'none' },
        })}
      >
        <SideNavigation aria-label="Client web navigation">
          <SideNavigationItem
            id="dashboard"
            topLevel
            linkText="Dashboard"
            startIcon={<IconHome />}
            active={activePage === 'dashboard'}
            onLinkClick={() => setActivePage('dashboard')}
          />

          <SideNavigationGroup
            id="team-group"
            show={teamOpen}
            itemProps={{
              id: 'team',
              topLevel: true,
              isParent: true,
              linkText: 'Team',
              startIcon: <IconUsers />,
              show: teamOpen,
              listId: 'team-group',
              active: activePage.startsWith('team'),
              onLinkClick: () => setTeamOpen(o => !o),
              onArrowClick: () => setTeamOpen(o => !o),
            }}
          >
            <SideNavigationItem
              id="team.agents"
              linkText="Agents"
              active={activePage === 'team.agents'}
              onLinkClick={() => setActivePage('team.agents')}
            />
            <SideNavigationItem
              id="team.staff"
              linkText="Staff"
              active={activePage === 'team.staff'}
              onLinkClick={() => setActivePage('team.staff')}
            />
          </SideNavigationGroup>

          <SideNavigationGroup
            id="leads-group"
            show={leadsOpen}
            itemProps={{
              id: 'leads',
              topLevel: true,
              isParent: true,
              linkText: 'Leads',
              startIcon: <IconList />,
              show: leadsOpen,
              listId: 'leads-group',
              active: activePage.startsWith('leads'),
              onLinkClick: () => setLeadsOpen(o => !o),
              onArrowClick: () => setLeadsOpen(o => !o),
            }}
          >
            <SideNavigationItem
              id="leads.all"
              linkText="All leads"
              active={activePage === 'leads.all'}
              onLinkClick={() => setActivePage('leads.all')}
            />
          </SideNavigationGroup>

          <SideNavigationGroup
            id="listings-group"
            show={listingsOpen}
            itemProps={{
              id: 'listings',
              topLevel: true,
              isParent: true,
              linkText: 'Listings',
              startIcon: <IconListingStatus />,
              show: listingsOpen,
              listId: 'listings-group',
              active: activePage.startsWith('listings'),
              onLinkClick: () => setListingsOpen(o => !o),
              onArrowClick: () => setListingsOpen(o => !o),
            }}
          >
            <SideNavigationItem
              id="listings.active"
              linkText="Active"
              active={activePage === 'listings.active'}
              onLinkClick={() => setActivePage('listings.active')}
            />
          </SideNavigationGroup>
        </SideNavigation>
      </aside>

      {/* ── Main content ── */}
      {/* Reserve only the collapsed rail width so the expanded rail overlays, not shifts. */}
      <div style={{ marginLeft: RAIL_WIDTH, marginTop: HEADER_HEIGHT }}>
        <main className={css({ px: '700', py: '600' })}>
          <AgentDetailScreen />
          <ShellFooter />
        </main>
      </div>

    </div>
  )
}
