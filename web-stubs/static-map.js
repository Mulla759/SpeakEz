const React = require("react");
const { View } = require("react-native");
const Ctx = React.createContext(null);
const DEF = { latitude: 44.9739, longitude: -93.2385, latitudeDelta: 0.016, longitudeDelta: 0.028 };
function proj(r, s, c) {
  const pxPerM = (s.h / (r.latitudeDelta * 111000)) * 0.62;
  const x = s.w / 2 + (c.longitude - r.longitude) * 78700 * pxPerM;
  const y = s.h / 2 - (c.latitude - r.latitude) * 111000 * pxPerM;
  return { x, y };
}
const MapView = React.forwardRef(function MapView(props, ref) {
  const [size, setSize] = React.useState({ w: 390, h: 844 });
  const region = props.region || props.initialRegion || (props.initialCamera && props.initialCamera.center ? { ...DEF, ...props.initialCamera.center } : DEF);
  React.useImperativeHandle(ref, () => ({ animateToRegion() {}, animateCamera() {}, fitToCoordinates() {}, getCamera: async () => ({ center: region, zoom: 15 }), setCamera() {} }));
  const P = (lat, lng) => proj(region, size, { latitude: lat, longitude: lng });
  const path = (pts) => pts.map((q, i) => { const r = P(q[0], q[1]); return (i ? "L" : "M") + r.x.toFixed(1) + " " + r.y.toFixed(1); }).join(" ");
  const pxPerM = (size.h / (region.latitudeDelta * 111000)) * 0.62;
  const hasMarkers = React.Children.toArray(props.children).some((ch) => ch && ch.type === Marker);
  const el = React.createElement;
  const M = require("./campus-map.js");
  const nw = P(M.n, M.w), se = P(M.s, M.e);
  const svg = el("svg", { key: "svg", width: size.w, height: size.h, style: { position: "absolute", left: 0, top: 0 } },
    el("rect", { key: "bg", x: 0, y: 0, width: size.w, height: size.h, fill: "#F3F2EE" }),
    el("image", { key: "map", href: M.uri, x: nw.x, y: nw.y, width: se.x - nw.x, height: se.y - nw.y, preserveAspectRatio: "none" }),
    hasMarkers ? null : [[44.97536,-93.2363],[44.97479,-93.23531],[44.97282,-93.23535],[44.9769,-93.23444],[44.97862,-93.2365],[44.9749,-93.2325],[44.97437,-93.23694],[44.97095,-93.24359],[44.97046,-93.24477],[44.97184,-93.24334],[44.9764,-93.2246],[44.9812,-93.2362],[44.9728,-93.2290]].map((q, i) => { const c = P(q[0], q[1]); return el("g", { key: "d" + i }, el("circle", { cx: c.x, cy: c.y, r: 7.5, fill: "#FFFFFF", opacity: 0.95 }), el("circle", { cx: c.x, cy: c.y, r: 5, fill: i % 3 === 2 ? "#A48FD0" : "#6B4FA0" })); })
  );
  const grid = [svg];
  return React.createElement(View, { style: [{ backgroundColor: "#F4F3EF", overflow: "hidden" }, props.style], onLayout: (e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }) },
    grid, React.createElement(Ctx.Provider, { value: { region, size } }, props.children));
});
function Marker(props) {
  const c = React.useContext(Ctx); if (!c || !props.coordinate) return null;
  const p = proj(c.region, c.size, props.coordinate);
  const a = props.anchor || { x: 0.5, y: 0.5 };
  return React.createElement(View, { style: { position: "absolute", left: p.x, top: p.y, transform: [{ translateX: "-" + a.x * 100 + "%" }, { translateY: "-" + a.y * 100 + "%" }] }, onClick: props.onPress }, props.children || React.createElement(View, { style: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#2F6B55" } }));
}
function Circle(props) {
  const c = React.useContext(Ctx); if (!c || !props.center) return null;
  const p = proj(c.region, c.size, props.center);
  const rpx = props.radius * (c.size.h / (c.region.latitudeDelta * 111000)) * 0.62;
  return React.createElement(View, { pointerEvents: "none", style: { position: "absolute", left: p.x - rpx, top: p.y - rpx, width: rpx * 2, height: rpx * 2, borderRadius: rpx, backgroundColor: props.fillColor, borderColor: props.strokeColor, borderWidth: props.strokeWidth || 0 } });
}
const Noop = () => null;
module.exports = MapView; module.exports.default = MapView; module.exports.Marker = Marker; module.exports.Circle = Circle;
module.exports.Polyline = Noop; module.exports.Polygon = Noop; module.exports.Callout = Noop; module.exports.PROVIDER_GOOGLE = "google"; module.exports.PROVIDER_DEFAULT = null;
