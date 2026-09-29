// Web implementation of the react-native-maps API used by speakEz, built on MapLibre GL:
// smooth vector map, pinch/drag/wheel zoom, animated camera moves, and React markers that follow the map.
const React = require("react");
const ReactDOM = require("react-dom");
const { View } = require("react-native");
const StaticMapView = require("./static-map.js");
require("maplibre-gl/dist/maplibre-gl.css");
const maplibregl = require("maplibre-gl");

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const DEF = { latitude: 44.9739, longitude: -93.2385, latitudeDelta: 0.016, longitudeDelta: 0.028 };
const MapCtx = React.createContext(null);
const h = React.createElement;

// Recolor the neutral basemap to speakEz: soft blue water, no green, warm paper ground.
function restyle(style) {
  const paint = {
    background: { "background-color": "#F4F2EE" },
    park: { "fill-color": "#ECEAE4" },
    landcover_wood: { "fill-color": "#ECEAE4" },
    landuse_residential: { "fill-color": "#EFEDE8" },
    water: { "fill-color": "#BCD4EA" },
    waterway: { "line-color": "#BCD4EA" },
    building: { "fill-color": "#E7E3DC", "fill-outline-color": "#D9D4CA" },
    highway_minor: { "line-color": "#FFFFFF", "line-opacity": 1 },
    highway_path: { "line-color": "#E9E5DD" },
    highway_major_casing: { "line-color": "#DAD5CB" },
    highway_motorway_casing: { "line-color": "#DAD5CB" },
    highway_motorway_bridge_casing: { "line-color": "#DAD5CB" },
    "highway-name-minor": { "text-color": "#7A756C" },
    "highway-name-major": { "text-color": "#6F6A61" },
    "highway-name-path": { "text-color": "#8A857B" },
    water_name_point_label: { "text-color": "#6D8BAA" },
    water_name_line_label: { "text-color": "#6D8BAA" },
    waterway_line_label: { "text-color": "#6D8BAA" },
    label_other: { "text-color": "#5F5A52" },
  };
  for (const layer of style.layers || []) {
    const p = paint[layer.id];
    if (p) layer.paint = { ...(layer.paint || {}), ...p };
  }
  return style;
}

let stylePromise = null;
function loadStyle() {
  if (!stylePromise) {
    stylePromise = fetch(STYLE_URL).then((r) => { if (!r.ok) throw new Error("style"); return r.json(); }).then(restyle).catch(() => STYLE_URL);
  }
  return stylePromise;
}

function zoomFor(region, heightPx) {
  const lat = region.latitude * Math.PI / 180;
  const z = Math.log2((Math.max(heightPx, 200) * 360 * Math.cos(lat)) / (512 * Math.max(region.latitudeDelta, 0.0002)));
  return Math.min(19, Math.max(3, z - 0.65));
}
function regionOf(map) {
  const b = map.getBounds(); const c = map.getCenter();
  return { latitude: c.lat, longitude: c.lng, latitudeDelta: b.getNorth() - b.getSouth(), longitudeDelta: b.getEast() - b.getWest() };
}
function metersPerPixel(lat, zoom) { return (40075016.686 * Math.cos(lat * Math.PI / 180)) / (512 * Math.pow(2, zoom)); }

const MapView = React.forwardRef(function MapView(props, ref) {
  const hostRef = React.useRef(null);
  const state = React.useRef({ map: null, markers: new Set(), circles: new Set(), props });
  const [overlay, setOverlay] = React.useState(null);
  const [failed, setFailed] = React.useState(false);
  state.current.props = props;

  const update = React.useCallback(() => {
    const s = state.current; const map = s.map; if (!map) return;
    const zoom = map.getZoom();
    s.markers.forEach((m) => {
      if (!m.node || !m.coordinate) return;
      const p = map.project([m.coordinate.longitude, m.coordinate.latitude]);
      const ax = (m.anchor && m.anchor.x != null ? m.anchor.x : 0.5) * 100;
      const ay = (m.anchor && m.anchor.y != null ? m.anchor.y : 0.5) * 100;
      const ox = m.centerOffset ? m.centerOffset.x || 0 : 0;
      const oy = m.centerOffset ? m.centerOffset.y || 0 : 0;
      m.node.style.transform = "translate3d(" + (p.x + ox).toFixed(1) + "px," + (p.y + oy).toFixed(1) + "px,0) translate(" + (-ax) + "%," + (-ay) + "%)";
      m.node.style.visibility = "visible";
    });
    s.circles.forEach((c) => {
      if (!c.node || !c.center) return;
      const p = map.project([c.center.longitude, c.center.latitude]);
      const r = c.radius / metersPerPixel(c.center.latitude, zoom);
      c.node.style.width = c.node.style.height = (r * 2).toFixed(1) + "px";
      c.node.style.transform = "translate3d(" + (p.x - r).toFixed(1) + "px," + (p.y - r).toFixed(1) + "px,0)";
      c.node.style.visibility = "visible";
    });
  }, []);

  React.useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    let disposed = false; let map = null; let ro = null; let pressTimer = null;
    const mapEl = document.createElement("div");
    mapEl.style.cssText = "position:absolute;left:0;top:0;right:0;bottom:0;background:#F4F2EE";
    const overlayEl = document.createElement("div");
    overlayEl.style.cssText = "position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;pointer-events:none";
    host.appendChild(mapEl); host.appendChild(overlayEl);

    const p0 = state.current.props;
    const init = () => {
      if (disposed || map) return;
      const w = host.clientWidth, hgt = host.clientHeight;
      if (!w || !hgt) return;
      const region = p0.region || p0.initialRegion || (p0.initialCamera && p0.initialCamera.center ? { ...DEF, ...p0.initialCamera.center } : DEF);
      const interactive = !(p0.scrollEnabled === false && p0.zoomEnabled === false);
      loadStyle().then((style) => {
        if (disposed) return;
        try {
          map = new maplibregl.Map({
            container: mapEl, style, center: [region.longitude, region.latitude], zoom: zoomFor(region, hgt),
            interactive, attributionControl: false, pitchWithRotate: false, dragRotate: false, maxPitch: 0,
            minZoom: 10, maxZoom: 19, fadeDuration: 150, renderWorldCopies: false, refreshExpiredTiles: false,
          });
        } catch (e) { setFailed(true); return; }
        state.current.map = map;
        if (interactive) { map.touchZoomRotate.disableRotation(); map.keyboard.disable(); }
        map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "" }), "bottom-right");
        const pad = p0.mapPadding;
        if (pad) map.setPadding({ top: pad.top || 0, bottom: pad.bottom || 0, left: pad.left || 0, right: pad.right || 0 });
        map.on("move", () => { update(); const cb = state.current.props.onRegionChange; if (cb) cb(regionOf(map)); });
        map.on("render", update);
        map.on("moveend", () => { const cb = state.current.props.onRegionChangeComplete; if (cb) cb(regionOf(map)); });
        map.on("click", (e) => { const cb = state.current.props.onPress; if (cb) cb({ nativeEvent: { coordinate: { latitude: e.lngLat.lat, longitude: e.lngLat.lng }, position: e.point } }); });
        const longPress = (lngLat, point) => { const cb = state.current.props.onLongPress; if (cb) cb({ nativeEvent: { coordinate: { latitude: lngLat.lat, longitude: lngLat.lng }, position: point } }); };
        map.on("contextmenu", (e) => longPress(e.lngLat, e.point));
        map.on("touchstart", (e) => { if (e.points && e.points.length > 1) return; pressTimer = setTimeout(() => longPress(e.lngLat, e.point), 550); });
        ["touchend", "touchmove", "touchcancel", "dragstart", "zoomstart"].forEach((t) => map.on(t, () => { clearTimeout(pressTimer); }));
        map.on("error", () => {});
        map.once("load", () => { update(); const cb = state.current.props.onMapReady; if (cb) cb(); const rc = state.current.props.onRegionChangeComplete; if (rc) rc(regionOf(map)); });
        update();
      });
    };
    setOverlay(overlayEl);
    init();
    ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { if (!map) init(); else map.resize(); }) : null;
    if (ro) ro.observe(host);
    return () => {
      disposed = true; clearTimeout(pressTimer); if (ro) ro.disconnect();
      try { if (map) map.remove(); } catch (e) {}
      state.current.map = null;
      try { host.removeChild(mapEl); host.removeChild(overlayEl); } catch (e) {}
    };
  }, [update]);

  const pad = props.mapPadding;
  const padKey = pad ? [pad.top, pad.right, pad.bottom, pad.left].join(",") : "";
  React.useEffect(() => {
    const map = state.current.map; if (!map || !pad) return;
    map.easeTo({ padding: { top: pad.top || 0, bottom: pad.bottom || 0, left: pad.left || 0, right: pad.right || 0 }, duration: 320 });
  }, [padKey]);

  React.useImperativeHandle(ref, () => ({
    animateToRegion(region, duration) {
      const map = state.current.map; if (!map) return;
      map.easeTo({ center: [region.longitude, region.latitude], zoom: zoomFor(region, map.getContainer().clientHeight), duration: duration == null ? 500 : duration, essential: true });
    },
    animateCamera(cam, opts) {
      const map = state.current.map; if (!map) return;
      const o = { duration: opts && opts.duration != null ? opts.duration : 500, essential: true };
      if (cam.center) o.center = [cam.center.longitude, cam.center.latitude];
      if (cam.zoom != null) o.zoom = cam.zoom;
      map.easeTo(o);
    },
    setCamera(cam) { const map = state.current.map; if (!map) return; const o = {}; if (cam.center) o.center = [cam.center.longitude, cam.center.latitude]; if (cam.zoom != null) o.zoom = cam.zoom; map.jumpTo(o); },
    fitToCoordinates(coords, opts) {
      const map = state.current.map; if (!map || !coords || !coords.length) return;
      const b = new maplibregl.LngLatBounds();
      coords.forEach((c) => b.extend([c.longitude, c.latitude]));
      const e = (opts && opts.edgePadding) || {};
      map.fitBounds(b, { padding: { top: e.top || 40, right: e.right || 40, bottom: e.bottom || 40, left: e.left || 40 }, duration: opts && opts.animated === false ? 0 : 500, maxZoom: 17 });
    },
    getCamera: async () => { const map = state.current.map; const c = map ? map.getCenter() : { lat: DEF.latitude, lng: DEF.longitude }; return { center: { latitude: c.lat, longitude: c.lng }, zoom: map ? map.getZoom() : 15, heading: 0, pitch: 0 }; },
    getMapBoundaries: async () => { const map = state.current.map; if (!map) return null; const b = map.getBounds(); return { northEast: { latitude: b.getNorth(), longitude: b.getEast() }, southWest: { latitude: b.getSouth(), longitude: b.getWest() } }; },
    pointForCoordinate: async (c) => { const map = state.current.map; const p = map.project([c.longitude, c.latitude]); return { x: p.x, y: p.y }; },
    coordinateForPoint: async (p) => { const map = state.current.map; const c = map.unproject([p.x, p.y]); return { latitude: c.lat, longitude: c.lng }; },
  }), []);

  const ctx = React.useMemo(() => ({ state, update }), [update]);
  if (failed) return h(StaticMapView, props);
  const style = [{ backgroundColor: "#F4F2EE", overflow: "hidden" }, props.style];
  return h(View, { ref: hostRef, style, pointerEvents: props.pointerEvents },
    overlay ? ReactDOM.createPortal(h(MapCtx.Provider, { value: ctx }, props.children), overlay) : null);
});

function Marker(props) {
  const ctx = React.useContext(MapCtx);
  const entry = React.useRef({}).current;
  entry.coordinate = props.coordinate; entry.anchor = props.anchor; entry.centerOffset = props.centerOffset;
  const setNode = React.useCallback((node) => {
    if (!ctx) return;
    const s = ctx.state.current;
    if (node) { entry.node = node; s.markers.add(entry); ctx.update(); }
    else { s.markers.delete(entry); entry.node = null; }
  }, [ctx]);
  React.useEffect(() => { if (ctx) ctx.update(); });
  if (!ctx) return h(StaticMapView.Marker, props);
  if (!props.coordinate) return null;
  const clickable = !!props.onPress;
  const kids = props.children || h("div", { style: { width: 14, height: 14, borderRadius: 7, background: "#6B4FA0", border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,.3)" } });
  return h("div", {
    ref: setNode,
    onClick: clickable ? (e) => { e.stopPropagation(); props.onPress(e); } : undefined,
    style: { position: "absolute", left: 0, top: 0, visibility: "hidden", zIndex: props.zIndex || 0, pointerEvents: clickable ? "auto" : "none", willChange: "transform", cursor: clickable ? "pointer" : "default" },
  }, kids);
}

function Circle(props) {
  const ctx = React.useContext(MapCtx);
  const entry = React.useRef({}).current;
  entry.center = props.center; entry.radius = props.radius;
  const setNode = React.useCallback((node) => {
    if (!ctx) return;
    const s = ctx.state.current;
    if (node) { entry.node = node; s.circles.add(entry); ctx.update(); }
    else { s.circles.delete(entry); entry.node = null; }
  }, [ctx]);
  React.useEffect(() => { if (ctx) ctx.update(); });
  if (!ctx) return h(StaticMapView.Circle, props);
  if (!props.center) return null;
  return h("div", {
    ref: setNode,
    style: { position: "absolute", left: 0, top: 0, visibility: "hidden", pointerEvents: "none", borderRadius: "50%", boxSizing: "border-box", background: props.fillColor || "transparent", border: (props.strokeWidth || 0) + "px solid " + (props.strokeColor || "transparent"), willChange: "transform,width,height" },
  });
}

const Noop = () => null;
module.exports = MapView; module.exports.default = MapView; module.exports.Marker = Marker; module.exports.Circle = Circle;
module.exports.Polyline = Noop; module.exports.Polygon = Noop; module.exports.Callout = Noop;
module.exports.PROVIDER_GOOGLE = "google"; module.exports.PROVIDER_DEFAULT = null;
