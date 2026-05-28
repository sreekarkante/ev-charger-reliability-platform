import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export const InteractiveMap = ({ stations, userCoords, onSelectStation, activeStationId }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);
  const userRingRef = useRef(null);

  // 1. Initial Map Setup
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center on the clustered stations in Bangalore
    const map = L.map(mapContainerRef.current, {
      center: [12.9585, 77.6435],
      zoom: 15,
      zoomControl: false
    });

    // Add standard Leaflet zoom buttons in bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Apply CartoDB Dark Matter tiles (premium smart-city aesthetics!)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; CartoDB'
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Draw/Update Stations Telemetry Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old station markers
    Object.keys(markersRef.current).forEach((id) => {
      map.removeLayer(markersRef.current[id]);
    });
    markersRef.current = {};

    stations.forEach((station) => {
      // Color selector based on state
      let color = '#F59E0B'; // Uncertain Yellow
      let pulseStyle = '';
      
      if (station.status === 'VERIFIED_WORKING') {
        color = '#10B981'; // Emerald Green
        pulseStyle = 'box-shadow: 0 0 12px #10B981;';
      } else if (station.status === 'LIKELY_WORKING') {
        color = '#34D399'; // Mint Green
      } else if (station.status === 'VERIFIED_BROKEN') {
        color = '#EF4444'; // Red
        pulseStyle = 'box-shadow: 0 0 12px #EF4444;';
      } else if (station.status === 'LIKELY_BROKEN') {
        color = '#F87171'; // Light Red
      }

      // Check if a queue is present to append a wait badge
      const queueBadge = station.queue_estimate > 0
        ? `<div style="position: absolute; top: -14px; right: -14px; background: #3B82F6; color: white; border: 1px solid #1D4ED8; font-size: 9px; font-weight: bold; border-radius: 4px; padding: 1px 3.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.5)">${Math.round(station.queue_estimate)}m</div>`
        : '';

      const isSelected = activeStationId === station.id;
      const borderStyle = isSelected ? 'border: 2px solid #00E5FF; scale: 1.25;' : 'border: 1px solid rgba(255,255,255,0.4);';

      // Custom Leaflet DivIcon
      const customIcon = L.divIcon({
        className: 'custom-station-icon',
        html: `
          <div style="position: relative; width: 22px; height: 22px;">
            <div style="
              width: 22px; 
              height: 22px; 
              border-radius: 50%; 
              background: ${color}; 
              ${borderStyle}
              ${pulseStyle}
              display: flex; 
              align-items: center; 
              justify-content: center;
              transition: all 0.2s ease-in-out;
            ">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            ${queueBadge}
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([station.latitude, station.longitude], { icon: customIcon });
      
      // Bind descriptive Popup
      const popupHtml = `
        <div style="font-family: 'Outfit', sans-serif; padding: 2px 4px;">
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #fff;">${station.name}</h4>
          <div style="font-size: 10px; color: #9CA3AF; margin-bottom: 6px;">
            ${station.charger_type} • ${station.connector_type} • <span style="color:#00E5FF;font-weight:600">${station.power_output} kW</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 8px;">
            <span style="font-weight: bold; color: ${color}">${station.status.replace('_', ' ')}</span>
            ${station.status !== 'UNCERTAIN' ? `<span style="color:#9CA3AF">(${Math.round(station.confidence_score * 100)}% conf)</span>` : ''}
          </div>
          <button id="pop-btn-${station.id}" style="
            width: 100%; 
            background: #00E5FF; 
            color: #0B0F19; 
            border: none; 
            padding: 5px; 
            border-radius: 4px; 
            font-size: 11px; 
            font-weight: 700; 
            cursor: pointer;
            transition: all 0.15s;
          " onmouseover="this.style.background='#00B8D4'" onmouseout="this.style.background='#00E5FF'">
            Open Operations Details
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { closeButton: false });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`pop-btn-${station.id}`);
        if (btn) {
          btn.addEventListener('click', () => {
            onSelectStation(station);
            map.closePopup();
          });
        }
      });

      marker.addTo(map);
      markersRef.current[station.id] = marker;
    });
  }, [stations, activeStationId, onSelectStation]);

  // 3. Draw/Update Simulated GPS Coordinates marker and its 200m radius ring
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const lat = userCoords.lat;
    const lng = userCoords.lng;

    // Draw user coordinate marker (Pulse light blue icon)
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
    } else {
      const userIcon = L.divIcon({
        className: 'user-gps-marker',
        html: `
          <div style="position: relative; width: 14px; height: 14px;">
            <div style="width: 14px; height: 14px; border-radius: 50%; background: #00E5FF; border: 2px solid white; box-shadow: 0 0 10px #00E5FF"></div>
            <div style="position: absolute; top:-5px; left:-5px; width:24px; height:24px; border-radius:50%; border:2px solid #00E5FF; opacity:0.4; animation: status-pulse 1.5s infinite"></div>
          </div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      userMarkerRef.current = L.marker([lat, lng], { icon: userIcon }).addTo(map);
    }

    // Draw geofence circle (200m reporting radius)
    if (userRingRef.current) {
      userRingRef.current.setLatLng([lat, lng]);
    } else {
      userRingRef.current = L.circle([lat, lng], {
        radius: 200,
        color: '#00E5FF',
        weight: 1.5,
        dashArray: '5, 8',
        fillColor: '#00E5FF',
        fillOpacity: 0.04
      }).addTo(map);
    }

  }, [userCoords]);

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl border border-dark-border shadow-glass">
      {/* Map Container Element */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Compass Overlay */}
      <div className="absolute top-4 left-4 z-[400] bg-dark-panel/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-dark-border text-xs flex items-center gap-2 text-white">
        <div className="w-2.5 h-2.5 rounded-full bg-brand-cyan pulse-dot"></div>
        Telemetry Region: <span className="text-brand-cyan font-semibold">Domlur / Indiranagar Cluster</span>
      </div>
    </div>
  );
};
