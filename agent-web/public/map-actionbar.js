/*
 * Shared responsive behaviour for the action bar on the standalone map pages
 * (`search-map.html`, `tours-map.html`). Those pages are framed in an iframe and cannot
 * import `src/components/ActionBar.tsx`, so this reproduces its measured, three-stage fold
 * in plain JS — the same control has to behave the same way on all four screens:
 *
 *   1. Full pills when there is room.
 *   2. As the row runs short, drop labels one at a time from the left — each action becomes
 *      an icon-only circle. The primary action (rightmost, the brand `Ask` pill) yields last.
 *   3. Once every action is already a circle and the row still overflows, fold circles into
 *      the overflow menu one at a time from the left (primary folds last). Folded actions
 *      appear as labelled rows below the menu's static items, behind a separator.
 *
 * The decision is measured, not keyed to a breakpoint: the space the bar gets depends on the
 * page title / search field beside it and on the assistant panel's dragged width, none of
 * which a media query sees. Each pass starts from the fully expanded state and degrades until
 * the header stops overflowing, so the input never changes as the output is applied and it
 * cannot oscillate — the same principle the React component's hidden mirror relies on.
 *
 * Structure assumed (identical on both pages): an `.actionbar` flex group whose first child
 * is the overflow menu (`#moreWrap` > `.menupanel`) and whose remaining children are the
 * action buttons, each an icon plus a `.lbl` span, in left-to-right DOM order.
 */
(function () {
  'use strict'

  function init() {
    var bar = document.querySelector('.actionbar')
    if (!bar) return
    // The flex row the bar lives in (`.hdr` on tours, `.topbar` on search). Its overflow is
    // what tells us the bar no longer fits: the title/search field shrink first, and only
    // once they hit their floor does this container overflow.
    var row = bar.parentElement
    var menuWrap = bar.querySelector('.menuwrap')
    var panel = menuWrap ? menuWrap.querySelector('.menupanel') : null
    var toggle = menuWrap ? menuWrap.querySelector('.iconbtn') : null
    if (!row || !menuWrap || !panel) return

    /*
     * Panel placement, mirroring src/components/Menu.tsx. The ⋯ toggle is the action bar's
     * leftmost item, so a panel that grew leftward (the CSS default, `right:0`) would spill off
     * the left edge of a narrow frame and truncate its labels. Instead the panel is positioned
     * from script: `fixed` so it escapes any clipping ancestor, its left edge anchored to the
     * toggle so it opens rightward into the map, and clamped to the viewport with an 8px margin.
     */
    var EDGE = 8
    var PANEL_MIN_W = 180
    function placeMenu() {
      if (!menuWrap.classList.contains('open') || !toggle) return
      var r = toggle.getBoundingClientRect()
      var w = Math.max(panel.offsetWidth, PANEL_MIN_W)
      var h = panel.offsetHeight
      // Grow rightward from the toggle's left edge.
      var left = Math.min(Math.max(r.left, EDGE), Math.max(window.innerWidth - w - EDGE, EDGE))
      // Below by preference; above when the panel would run off the bottom.
      var below = r.bottom + EDGE
      var flip = h > 0 && below + h > window.innerHeight - EDGE && r.top - EDGE - h >= EDGE
      var top = flip ? r.top - EDGE - h : below
      top = Math.min(Math.max(top, EDGE), Math.max(window.innerHeight - h - EDGE, EDGE))
      panel.style.position = 'fixed'
      panel.style.left = left + 'px'
      panel.style.top = top + 'px'
      panel.style.right = 'auto'
    }

    // Action buttons: every bar child except the overflow menu, left-to-right.
    var actionsAll = Array.prototype.filter.call(bar.children, function (el) {
      return el !== menuWrap
    })
    if (!actionsAll.length) return

    function cssVisible(el) {
      return getComputedStyle(el).display !== 'none'
    }

    function labelOf(btn) {
      var lbl = btn.querySelector('.lbl')
      return ((lbl ? lbl.textContent : btn.textContent) || '').trim()
    }

    // Collapse to a circle by inline styles, so it works without touching either page's CSS.
    // Unset (rather than a fixed value) returns the button to its pill geometry.
    function collapse(btn, on) {
      var lbl = btn.querySelector('.lbl')
      btn.style.width = on ? '36px' : ''
      btn.style.padding = on ? '0' : ''
      btn.style.justifyContent = on ? 'center' : ''
      if (lbl) lbl.style.display = on ? 'none' : ''
    }

    // Everything this script adds to the menu carries `.mi-folded`, so a reset can strip it
    // without disturbing the page's own static rows.
    function clearFolded() {
      var extras = panel.querySelectorAll('.mi-folded')
      Array.prototype.forEach.call(extras, function (n) {
        n.remove()
      })
    }

    function addSeparator() {
      // Only when there are static rows above to fence the folded actions off from.
      if (!panel.querySelector('.menuitem:not(.mi-folded)')) return
      if (panel.querySelector('.mi-sep')) return
      var sep = document.createElement('div')
      sep.className = 'mi-sep mi-folded'
      sep.setAttribute('role', 'separator')
      sep.style.height = '1px'
      sep.style.background = '#E9E7E4'
      sep.style.margin = '5px 8px'
      panel.appendChild(sep)
    }

    function fold(btn) {
      btn.style.display = 'none'
      var item = document.createElement('button')
      item.type = 'button'
      item.className = 'menuitem mi-folded'
      item.setAttribute('role', 'menuitem')
      item.style.gap = '10px'

      var svg = btn.querySelector('svg')
      if (svg) {
        var ico = svg.cloneNode(true)
        ico.setAttribute('width', '16')
        ico.setAttribute('height', '16')
        var slot = document.createElement('span')
        slot.style.display = 'flex'
        slot.style.flex = 'none'
        slot.style.alignItems = 'center'
        slot.style.justifyContent = 'center'
        slot.style.width = '18px'
        slot.style.color = '#958A7F'
        slot.appendChild(ico)
        item.appendChild(slot)
      }
      item.appendChild(document.createTextNode(labelOf(btn)))

      item.addEventListener('click', function () {
        // Close the menu the same way the page's own handler does, then do what the pill did.
        menuWrap.classList.remove('open')
        var toggle = menuWrap.querySelector('.iconbtn')
        if (toggle) toggle.setAttribute('aria-expanded', 'false')
        btn.click()
      })
      panel.appendChild(item)
    }

    // Reading scrollWidth forces a synchronous reflow, so this reflects every mutation made
    // earlier in the same pass — the loop below can trust it after each step.
    function fits() {
      return row.scrollWidth <= row.clientWidth + 1
    }

    function reset() {
      clearFolded()
      actionsAll.forEach(function (btn) {
        // Back to CSS control: the brand Ask button stays hidden while the panel is open,
        // because the page hides it with a body class rather than an inline style.
        btn.style.display = ''
        collapse(btn, false)
      })
    }

    function apply() {
      reset()
      // Only the actions the page is actually showing — excludes Ask while the assistant
      // panel is open, since CSS has hidden it.
      var actions = actionsAll.filter(cssVisible)
      var n = actions.length
      if (!n || fits()) return

      // Stage 2: labels off, left-to-right.
      for (var c = 0; c < n; c++) {
        collapse(actions[c], true)
        if (fits()) return
      }
      // Stage 3: fold into the menu, left-to-right.
      for (var f = 0; f < n; f++) {
        addSeparator()
        fold(actions[f])
        if (fits()) return
      }
    }

    var raf = 0
    function schedule() {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(function () {
        raf = 0
        apply()
      })
    }

    schedule()
    window.addEventListener('resize', schedule)
    // The panel's fixed coordinates go stale the moment the toggle moves; keep them current.
    window.addEventListener('resize', placeMenu)
    document.addEventListener('scroll', placeMenu, true)
    // The display face lands after first paint and its labels are wider.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(schedule).catch(function () {})
    }
    // `ab-b` and `ask-open` are toggled as body classes; both change which actions show and
    // how much room the row has, so re-measure whenever the body class list changes.
    new MutationObserver(schedule).observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    })
    // The page's own handler toggles `.open` on the menu wrapper; place the panel each time it
    // opens (its size is only known once it is displayed), from this shared, dynamic logic.
    new MutationObserver(placeMenu).observe(menuWrap, {
      attributes: true,
      attributeFilter: ['class'],
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
