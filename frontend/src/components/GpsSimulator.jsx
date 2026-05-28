import React, { useState } from 'react';
import { MapPin, Zap, ShieldAlert, Sparkles, Navigation } from 'lucide-react';

const presetLocations = [
  {
    name: 'Nexus Alpha (Valid Range)',
    lat: 12.95925,
    lng: 77.64443,
    type: 'valid'
  },
  {
    name: 'EcoSpace (Valid Range)',
    lat: 12.95608,
    lng: 77.64052,
    type: 'valid'
  },
  {
    name: 'Signature towers (Valid Range)',
    lat: 12.95752,
    lng: 77.64305,
    type: 'valid'
  },
  {
    name: 'Out of Range (3.2 km away)',
    lat: 12.93000,
    lng: 77.61000,
    type: 'invalid'
  },
  {
    name: 'Cheat Velocity: Bangalore -> Hyderabad',
    lat: 17.38504,
    lng: 78.48667,
    type: 'cheat'
  }
];

export const GpsSimulator = ({ currentCoords, setCoords, addLog }) => {
  const [selectedPreset, setSelectedPreset] = useState('Nexus Alpha (Valid Range)');
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset.name);
    setCoords({ lat: preset.lat, lng: preset.lng });
    setCustomLat(preset.lat.toString());
    setCustomLng(preset.lng.toString());
    
    if (preset.type === 'valid') {
      addLog(`[GPS SIMULATOR] Position updated to local cluster: [${preset.lat.toFixed(5)}, ${preset.lng.toFixed(5)}]. Ready for validated report.`, 'info');
    } else if (preset.type === 'invalid') {
      addLog(`[GPS SIMULATOR] Position moved far away: [${preset.lat.toFixed(5)}, ${preset.lng.toFixed(5)}]. Submitting reports will trigger GPS distance rejection.`, 'warn');
    } else if (preset.type === 'cheat') {
      addLog(`[GPS SIMULATOR] Teleported to Hyderabad: [${preset.lat.toFixed(5)}, ${preset.lng.toFixed(5)}]. Reporting again immediately will trigger Impossible Travel Abuse suspension!`, 'error');
    }
  };

  const handleManualTeleport = (e) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);

    if (isNaN(lat) || isNaN(lng)) {
      addLog('[GPS SIMULATOR] Invalid manual coordinates entered.', 'error');
      return;
    }

    setSelectedPreset('Manual Custom Coordinates');
    setCoords({ lat, lng });
    addLog(`[GPS SIMULATOR] Teleported manually to coordinate: [${lat.toFixed(5)}, ${lng.toFixed(5)}]`, 'info');
  };

  return (
    <div className="glass-panel rounded-xl p-4 mb-4 border-l-4 border-brand-cyan shadow-glow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-brand-cyan font-bold tracking-wide text-sm uppercase">
          <Navigation className="w-4 h-4 pulse-dot text-brand-cyan" />
          GPS Location Simulator Control
        </div>
        <div className="text-xs bg-dark-bg text-gray-400 px-2 py-0.5 rounded border border-dark-border">
          Active Coordinate: <span className="text-brand-cyan font-mono">{currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}</span>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-3">
        Use this telemetry panel to simulate your physical GPS coordinates. Test distance rejection limits or trigger impossible travel speed bans.
      </p>

      {/* Preset Toolbar row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 mb-3">
        {presetLocations.map((loc) => {
          const isActive = selectedPreset === loc.name;
          let colorClass = 'border-dark-border text-gray-300 hover:bg-dark-panelLight';
          
          if (isActive) {
            if (loc.type === 'valid') colorClass = 'bg-brand-emerald/10 border-brand-emerald text-brand-emerald font-semibold';
            else if (loc.type === 'invalid') colorClass = 'bg-brand-amber/10 border-brand-amber text-brand-amber font-semibold';
            else colorClass = 'bg-brand-rose/20 border-brand-rose text-brand-rose font-semibold';
          }

          return (
            <button
              key={loc.name}
              type="button"
              onClick={() => handlePresetSelect(loc)}
              className={`flex items-center gap-1.5 justify-center py-2 px-2 text-xs rounded border transition-all duration-200 text-center ${colorClass}`}
            >
              {loc.type === 'valid' && <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />}
              {loc.type === 'invalid' && <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />}
              {loc.type === 'cheat' && <Zap className="w-3.5 h-3.5 flex-shrink-0" />}
              {loc.name.split(' (')[0]}
            </button>
          );
        })}
      </div>

      {/* Manual coordinates input (Proactive feature addition!) */}
      <form onSubmit={handleManualTeleport} className="flex flex-col sm:flex-row items-end gap-2 border-t border-dark-border/40 pt-3">
        <div className="flex-1 w-full grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-gray-400 uppercase tracking-wider block mb-1">Simulate Custom Latitude</label>
            <input
              type="number"
              step="any"
              required
              placeholder="e.g. 12.9580"
              value={customLat}
              onChange={(e) => setCustomLat(e.target.value)}
              className="w-full glass-input rounded p-1.5 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-[9px] text-gray-400 uppercase tracking-wider block mb-1">Simulate Custom Longitude</label>
            <input
              type="number"
              step="any"
              required
              placeholder="e.g. 77.6420"
              value={customLng}
              onChange={(e) => setCustomLng(e.target.value)}
              className="w-full glass-input rounded p-1.5 text-xs text-white"
            />
          </div>
        </div>
        <button
          type="submit"
          className="bg-brand-cyan hover:bg-brand-cyanDark text-dark-bg text-xs font-bold px-4 py-2 rounded-lg transition shadow-glow flex items-center gap-1 w-full sm:w-auto justify-center"
        >
          <Navigation className="w-3.5 h-3.5" />
          Simulate Location
        </button>
      </form>

    </div>
  );
};
