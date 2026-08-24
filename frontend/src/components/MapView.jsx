import { useEffect, useRef, useState } from "react";

/* v1(index.html)의 buildMarkerIcon 로직 이식: 방문(녹색 체크) + 충전소 인근(파란 번개) 배지를 동시에 표시 */
function badgeHtml(bg, label) {
  return `<div style="width:22px;height:22px;border-radius:50%;background:${bg};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold;">${label}</div>`;
}

function buildIcon(hasVisit, hasEv) {
  if (!hasVisit && !hasEv) return null;
  const badges = [];
  if (hasVisit) badges.push(badgeHtml("#28a745", "✓"));
  if (hasEv) badges.push(badgeHtml("#2b6fd6", "⚡"));
  const width = badges.length * 22 + (badges.length - 1) * 2;
  return {
    content: `<div style="display:flex;gap:2px;">${badges.join("")}</div>`,
    anchor: new window.naver.maps.Point(width / 2, 11),
  };
}

export default function MapView({ naverClientId, items, notedAddresses, onMarkerClick }) {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const onMarkerClickRef = useRef(onMarkerClick);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  useEffect(() => {
    if (!naverClientId) return;
    if (window.naver && window.naver.maps) {
      setSdkLoaded(true);
      return;
    }
    const existing = document.getElementById("naverSdk");
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = "naverSdk";
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${naverClientId}&submodules=geocoder`;
    script.onload = () => setSdkLoaded(true);
    script.onerror = () => alert("네이버 지도 SDK 로드 실패. Client ID 또는 Web 서비스 URL 등록을 확인해주세요.");
    document.head.appendChild(script);
  }, [naverClientId]);

  useEffect(() => {
    if (!sdkLoaded || !mapDivRef.current || mapRef.current) return;
    mapRef.current = new window.naver.maps.Map(mapDivRef.current, {
      center: new window.naver.maps.LatLng(37.5665, 126.978),
      zoom: 11,
    });
  }, [sdkLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.values(markersRef.current).forEach((m) => m.setMap(null));
    markersRef.current = {};

    const bounds = new window.naver.maps.LatLngBounds();
    let any = false;

    items.forEach((item) => {
      if (!item.ok || item.lat == null || item.lng == null) return;
      const pos = new window.naver.maps.LatLng(item.lat, item.lng);
      const marker = new window.naver.maps.Marker({ map, position: pos });
      const icon = buildIcon(notedAddresses.has(item.address), !!item.evNearby);
      if (icon) marker.setIcon(icon);
      window.naver.maps.Event.addListener(marker, "click", () =>
        onMarkerClickRef.current(item.address, item.label)
      );
      markersRef.current[item.address] = marker;
      bounds.extend(pos);
      any = true;
    });

    if (any) map.fitBounds(bounds);
  }, [items, notedAddresses, sdkLoaded]);

  return (
    <div className="map-wrap">
      <div ref={mapDivRef} />
    </div>
  );
}
