import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { Map, MapLayerMouseEvent } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

type ServiceLayer = {
  id: string
  label: string
  file: string
  color: string
  symbol: string
  enabled: boolean
}

const serviceLayers: ServiceLayer[] = [
  { id: 'hospitals', label: 'Hospitals', file: 'hospitals.geojson', color: '#c2533d', symbol: '+' , enabled: true },
  { id: 'police-stations', label: 'Police stations', file: 'police-stations.geojson', color: '#c2533d', symbol: 'P', enabled: true },
  { id: 'fire-stations', label: 'Fire stations', file: 'fire-stations.geojson', color: '#c2533d', symbol: 'F', enabled: true },
  { id: 'public-toilets', label: 'Public toilets', file: 'public-toilets.geojson', color: '#c2533d', symbol: 'W', enabled: true },
  { id: 'parking-zones', label: 'Parking zones', file: 'parking-zones.geojson', color: '#d58a3d', symbol: 'P', enabled: true },
  { id: 'bus-stops', label: 'Bus stops', file: 'bus-stops.geojson', color: '#245bd7', symbol: 'B', enabled: true },
  { id: 'ghats', label: 'Ghats', file: 'ghats.geojson', color: '#7834e8', symbol: 'G', enabled: true },
  { id: 'ambulances', label: 'Ambulances', file: 'ambulances.geojson', color: '#c64c4d', symbol: 'A', enabled: false },
  { id: 'mandirs', label: 'Mandirs', file: 'mandirs.geojson', color: '#7834e8', symbol: 'M', enabled: false },
]

const initialEnabled = Object.fromEntries(serviceLayers.map((layer) => [layer.id, false]))

const volunteerPosts = [
  { name: 'Ramkund Gate', coordinates: [73.7911, 20.0055] as [number, number], detail: '38 of 42 volunteers present' },
  { name: 'Panchavati North', coordinates: [73.7928, 20.0122] as [number, number], detail: '28 of 28 volunteers present' },
  { name: 'Tapovan Transit', coordinates: [73.8171, 20.0274] as [number, number], detail: '17 of 24 volunteers present · critical gap' },
]

const mapStyle = {
  version: 8 as const,
  sources: {
    openStreetMap: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'open-street-map', type: 'raster' as const, source: 'openStreetMap' }],
}

function featureTitle(properties: Record<string, unknown> | null | undefined, fallback: string): string {
  const value = properties?.name ?? properties?.Name ?? properties?.NAME ?? properties?.title
  return typeof value === 'string' && value.trim() ? value : fallback
}

type SelectedLocation = {
  title: string
  category: string
  properties?: Record<string, unknown> | null
  detail?: string
}

export default function NashikMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const serviceMarkersRef = useRef(new globalThis.Map<string, maplibregl.Marker[]>())
  const [enabled, setEnabled] = useState<Record<string, boolean>>(initialEnabled)
  const enabledRef = useRef(enabled)
  const [monochrome, setMonochrome] = useState(false)
  const monochromeRef = useRef(monochrome)
  const [locating, setLocating] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return
    const markerStore = serviceMarkersRef.current
    const map = new maplibregl.Map({ container: mapContainer.current, style: mapStyle, center: [73.7898, 19.9975], zoom: 11.7, attributionControl: { compact: true } })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100 }), 'bottom-left')

    const markerElements: maplibregl.Marker[] = volunteerPosts.map((post) => {
      const element = document.createElement('button')
      element.className = 'volunteer-marker'
      element.type = 'button'
      element.textContent = 'V'
      element.title = post.name
      element.addEventListener('click', () => setSelectedLocation({ title: post.name, category: 'Volunteer post', detail: post.detail }))
      return new maplibregl.Marker({ element }).setLngLat(post.coordinates).addTo(map)
    })
    const serviceMarkers: maplibregl.Marker[] = []

    const addLayer = async (layer: ServiceLayer) => {
      try {
        const response = await fetch(`/nashik-data/${layer.file}`)
        if (!response.ok || !mapRef.current) return
        const data = await response.json()
        if (map.getSource(layer.id)) return
        map.addSource(layer.id, { type: 'geojson', data })
        const visibility = initialEnabled[layer.id] ? 'visible' : 'none'
        const layerColor = monochromeRef.current ? '#c2533d' : layer.color
        map.addLayer({ id: `${layer.id}-points`, type: 'circle', source: layer.id, filter: ['==', ['geometry-type'], 'Point'], layout: { visibility }, paint: { 'circle-color': layerColor, 'circle-radius': 4, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1, 'circle-opacity': 0.82 } })
        map.addLayer({ id: `${layer.id}-lines`, type: 'line', source: layer.id, filter: ['in', ['geometry-type'], ['literal', ['LineString', 'Polygon']]], layout: { visibility }, paint: { 'line-color': layerColor, 'line-width': 1.8, 'line-opacity': 0.58 } })
        map.addLayer({ id: `${layer.id}-fills`, type: 'fill', source: layer.id, filter: ['==', ['geometry-type'], 'Polygon'], layout: { visibility }, paint: { 'fill-color': layerColor, 'fill-opacity': 0.1 } })
        map.on('click', `${layer.id}-points`, (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0]
          if (!feature) return
          setSelectedLocation({ title: featureTitle(feature.properties, layer.label), category: layer.label, properties: feature.properties })
        })
        map.on('mouseenter', `${layer.id}-points`, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', `${layer.id}-points`, () => { map.getCanvas().style.cursor = '' })

        // Keep point locations visible even when a browser cannot paint a
        // MapLibre circle layer reliably over the raster basemap.
        const pointFeatures = data.features.filter((feature: { geometry?: { type?: string; coordinates?: unknown } }) => feature.geometry?.type === 'Point')
        const layerMarkers: maplibregl.Marker[] = []
        pointFeatures.forEach((feature: { geometry: { coordinates: [number, number] }; properties?: Record<string, unknown> }) => {
          const element = document.createElement('button')
          element.className = `service-marker service-marker-${layer.id}`
          element.type = 'button'
          element.textContent = layer.symbol
          element.title = featureTitle(feature.properties, layer.label)
          element.style.setProperty('--service-color', monochromeRef.current ? '#c2533d' : layer.color)
          element.addEventListener('click', () => setSelectedLocation({ title: featureTitle(feature.properties, layer.label), category: layer.label, properties: feature.properties }))
          const marker = new maplibregl.Marker({ element, anchor: 'center' }).setLngLat(feature.geometry.coordinates).addTo(map)
          serviceMarkers.push(marker)
          layerMarkers.push(marker)
          element.style.display = enabledRef.current[layer.id] ? '' : 'none'
        })
        markerStore.set(layer.id, layerMarkers)
      } catch (error) {
        console.error(`Could not load ${layer.file}`, error)
      }
    }

    const onLoad = () => serviceLayers.forEach((layer) => void addLayer(layer))
    map.on('load', onLoad)
    return () => {
      markerElements.forEach((marker) => marker.remove())
      serviceMarkers.forEach((marker) => marker.remove())
      markerStore.clear()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    enabledRef.current = enabled
    if (!map) return
    const markerStore = serviceMarkersRef.current
    serviceLayers.forEach((layer) => {
      const visibility = enabled[layer.id] ? 'visible' : 'none'
      ;[`${layer.id}-points`, `${layer.id}-lines`, `${layer.id}-fills`].forEach((layerId) => {
        if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility)
      })
      markerStore.get(layer.id)?.forEach((marker) => {
        marker.getElement().style.display = enabled[layer.id] ? '' : 'none'
      })
    })
  }, [enabled])

  useEffect(() => {
    monochromeRef.current = monochrome
    const map = mapRef.current
    const monochromeColor = '#c2533d'
    if (!map) return
    serviceLayers.forEach((layer) => {
      const color = monochrome ? monochromeColor : layer.color
      if (map.getLayer(`${layer.id}-points`)) map.setPaintProperty(`${layer.id}-points`, 'circle-color', color)
      if (map.getLayer(`${layer.id}-lines`)) map.setPaintProperty(`${layer.id}-lines`, 'line-color', color)
      if (map.getLayer(`${layer.id}-fills`)) map.setPaintProperty(`${layer.id}-fills`, 'fill-color', color)
      serviceMarkersRef.current.get(layer.id)?.forEach((marker) => marker.getElement().style.setProperty('--service-color', color))
    })
  }, [monochrome])

  const toggleLayer = (layer: ServiceLayer) => {
    setEnabled((current) => ({ ...current, [layer.id]: !current[layer.id] }))
  }

  const locateVolunteer = () => {
    if (!navigator.geolocation || !mapRef.current) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition((position) => {
      mapRef.current?.flyTo({ center: [position.coords.longitude, position.coords.latitude], zoom: 14 })
      setSelectedLocation({ title: 'Your location', category: 'Current position', detail: 'Use nearby service markers to plan your route.' })
      setLocating(false)
    }, () => setLocating(false))
  }

  return <section className="map-workspace">
    <div className="map-intro"><div><p className="section-kicker">FIELD NAVIGATION · NASHIK</p><h2>Where should I go?</h2><p className="muted">Volunteer posts and essential services from the Nashik city map.</p></div><button className="outline-button" onClick={locateVolunteer}>{locating ? 'Locating...' : 'Use my location'} <span>◎</span></button></div>
    <div className="map-layout"><aside className="map-legend"><div className="map-brand"><strong>Nashik Monitor</strong><span>KUMBH MELA 2027</span></div><div className="map-modes"><button className="active" type="button">Map</button><button type="button">Streets</button></div><button className="terrain-button" type="button">3D terrain</button><div className="map-appearance" role="group" aria-label="Map appearance"><span>Map colors</span><button className={!monochrome ? 'active' : ''} type="button" onClick={() => setMonochrome(false)}>Color</button><button className={monochrome ? 'active' : ''} type="button" onClick={() => setMonochrome(true)}>Single color</button></div><div className="legend-heading"><div><span className="section-kicker">MAP LAYERS</span><h3>Essential services</h3></div><span className="layer-count">{Object.values(enabled).filter(Boolean).length} on</span></div><div className="legend-group"><span className="legend-label">VOLUNTEER POSTS</span><div className="legend-item"><i className="legend-dot volunteer"></i><span>Assigned posts</span></div></div><div className="legend-group"><span className="legend-label">CITY SERVICES</span>{serviceLayers.map((layer) => <label className="legend-item" key={layer.id}><i className="legend-dot" style={{ background: monochrome ? '#c2533d' : layer.color }}></i><span>{layer.label}</span><input type="checkbox" checked={enabled[layer.id]} onChange={() => toggleLayer(layer)} /></label>)}</div><p className="map-source">Open data from Nashik Monitor · map data loads locally in this app.</p></aside><div className="map-frame"><div ref={mapContainer} className="nashik-map" aria-label="Interactive map of Nashik volunteer posts and essential services"></div><div className="map-status"><span className="map-live-dot"></span>Live volunteer posts <span>·</span> Nashik district</div>{selectedLocation && <LocationPanel location={selectedLocation} onClose={() => setSelectedLocation(null)} />}</div></div>
  </section>
}

function LocationPanel({ location, onClose }: { location: SelectedLocation; onClose: () => void }) {
  const details = Object.entries(location.properties ?? {}).filter(([, value]) => value !== null && value !== '' && typeof value !== 'object').slice(0, 8)
  return <aside className="location-panel" aria-label="Location details"><button className="location-close" onClick={onClose} aria-label="Close location details">x</button><h3>{location.title}</h3><p className="location-category"><i></i>{location.category}</p>{location.detail && <p className="location-detail">{location.detail}</p>}{details.length > 0 && <dl>{details.map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, ' $1')}</dt><dd>{String(value)}</dd></div>)}</dl>}<div className="location-footer">Nashik Monitor data</div></aside>
}
