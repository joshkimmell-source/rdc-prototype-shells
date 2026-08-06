/** Search: the Leaflet map-search page, embedded as-is from public/search-map.html. */
export function SearchScreen() {
  return (
    <div
      data-screen-label="Search"
      style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: '#FFFFFF', display: 'flex' }}
    >
      <iframe
        src="search-map.html"
        title="Map search"
        style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
      />
    </div>
  )
}
