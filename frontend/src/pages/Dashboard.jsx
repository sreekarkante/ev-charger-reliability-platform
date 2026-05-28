import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { stationService } from '../services/api';
import { LeftPanel } from '../components/LeftPanel';
import { InteractiveMap } from '../components/InteractiveMap';
import { StationDetail } from '../components/StationDetail';
import { GpsSimulator } from '../components/GpsSimulator';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Zap, LogIn, LogOut, ShieldAlert, Sparkles, Filter, Navigation, RefreshCw 
} from 'lucide-react';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();

  // Coordinates simulated by user (starts at Nexus Alpha)
  const [coords, setCoords] = useState({ lat: 12.95925, lng: 77.64443 });
  
  // Grid Nodes Telemetry States
  const [stations, setStations] = useState([]);
  const [activeStation, setActiveStation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [chargerType, setChargerType] = useState('');
  const [connectorType, setConnectorType] = useState('');
  const [useRecommender, setUseRecommender] = useState(true); // Default recommended sorting!

  // Live Terminal Logs
  const [logs, setLogs] = useState([
    { id: 'init-1', time: new Date().toLocaleTimeString(), text: '[SYSTEM ONLINE] ChargeSentinel central telemetry active.', type: 'success' },
    { id: 'init-2', time: new Date().toLocaleTimeString(), text: '[GPS ACTIVE] GPS tracking simulated at local clusters.', type: 'info' }
  ]);

  const addLog = (text, type = 'info') => {
    setLogs((prev) => [
      {
        id: Math.random().toString(),
        time: new Date().toLocaleTimeString(),
        text,
        type
      },
      ...prev.slice(0, 49) // Keep last 50 logs
    ]);
  };

  // 1. Fetch Charging Grid Nodes
  const fetchStations = async () => {
    try {
      const filters = {};
      if (chargerType) filters.charger_type = chargerType;
      if (connectorType) filters.connector_type = connectorType;
      
      // If recommender is toggled, append current simulated coordinates
      if (useRecommender) {
        filters.user_lat = coords.lat;
        filters.user_lng = coords.lng;
      }

      const data = await stationService.getAll(filters);
      setStations(data);
      setLoading(false);
    } catch (err) {
      console.error('[STATION FETCH ERROR]', err);
      addLog('Failed to fetch node telemetries from central grid.', 'error');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, [chargerType, connectorType, useRecommender, coords]);

  // 2. Real-time WebSocket Listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for station consensus/queue updates
    socket.on('station_update', (updatedStation) => {
      setStations((prevStations) => {
        // Map and replace the matching station
        const nextStations = prevStations.map((s) => 
          s.id === updatedStation.id 
            ? { ...s, ...updatedStation, distance: s.distance, recommendation_score: s.recommendation_score } 
            : s
        );

        // If user coordinates exist, trigger re-sort
        return nextStations;
      });

      // Update active station details panel if open
      setActiveStation((curr) => {
        if (curr && curr.id === updatedStation.id) {
          return { ...curr, ...updatedStation };
        }
        return curr;
      });

      let alertType = 'info';
      if (updatedStation.status.includes('WORKING')) alertType = 'success';
      if (updatedStation.status.includes('BROKEN')) alertType = 'error';

      addLog(
        `[WEBSOCKET UPDATE] Station ${updatedStation.name} consensus calculated to ${updatedStation.status.replace('_', ' ')} (Conf: ${Math.round(updatedStation.confidence_score * 100)}%).`,
        alertType
      );
    });

    // Listen for live crowdsourced reports
    socket.on('new_report', (payload) => {
      const { report } = payload;
      const isWorking = report.report_type.includes('WORKING');
      addLog(
        `[NEW REPORT] User ${report.user.name} (trust: ${report.user.trust_score.toFixed(2)}) submitted a report for node ${report.report_type} (${isWorking ? '🟢 Working' : '🔴 Broken'}).`,
        isWorking ? 'success' : 'warn'
      );
    });

    return () => {
      socket.off('station_update');
      socket.off('new_report');
    };
  }, [socket]);

  const handleSelectStation = (station) => {
    setActiveStation(station);
    addLog(`[MONITOR NODE] Listening to station telemetry: ${station.name}`, 'info');
  };

  const handleReportSuccess = (updatedStation) => {
    // Refresh stations to reflect score changes instantly
    fetchStations();
  };

  const handleLogout = () => {
    logout();
    addLog('[AUTH] Operator session signed out successfully.', 'info');
  };

  return (
    <div className="min-h-screen bg-dark-bg text-gray-200 flex flex-col font-sans">
      
      {/* 1. Global Navigation Bar */}
      <header className="bg-dark-panel border-b border-dark-border px-4 py-3 shadow-glass flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-1.5 leading-none">
            <span>🛡️ CHARGE</span>SENTINEL
          </h1>
          <span className="hidden sm:inline-block text-[9px] bg-dark-panelLight text-brand-cyan font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-dark-border">
            Operations Center Dashboard
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Active User profile details */}
          {user ? (
            <div className="flex items-center gap-3 bg-dark-bg/60 px-3 py-1.5 rounded-lg border border-dark-border">
              <div className="text-left leading-tight">
                <div className="text-xs text-white font-bold">{user.name}</div>
                <div className="text-[9px] text-gray-400 font-mono">
                  Trust Score: <span className="text-brand-emerald font-bold">{user.trustScore?.toFixed(3) || '0.50'}</span>
                </div>
              </div>
              
              {user.role === 'ADMIN' && (
                <Link 
                  to="/admin"
                  className="bg-brand-cyan hover:bg-brand-cyan/80 text-dark-bg font-bold px-2 py-1 rounded text-[10px] tracking-wide uppercase transition-all shadow-glow"
                >
                  Admin Command
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white p-1 rounded transition hover:bg-dark-panelLight"
                title="Decommission Operations session"
              >
                <LogOut className="w-4 h-4 text-brand-rose" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-brand-cyan hover:bg-brand-cyanDark text-dark-bg font-extrabold px-3 py-1.5 rounded-lg text-xs transition duration-150 flex items-center gap-1 shadow-glow"
            >
              <LogIn className="w-3.5 h-3.5" />
              Access Command
            </Link>
          )}

          {/* WebSocket Connectivity status indicator */}
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono border border-dark-border bg-dark-bg/40 px-2 py-1 rounded">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-emerald' : 'bg-brand-rose'} pulse-dot`}></span>
            WS: {connected ? 'SYNCED' : 'OFFLINE'}
          </div>
        </div>
      </header>

      {/* 2. Main Dashboard Layout Area */}
      <main className="flex-1 p-4 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden h-[calc(100vh-60px)]">
        
        {/* Left Side: System aggregates and live logging term feed */}
        <div className="md:col-span-1 flex flex-col overflow-hidden max-h-[85vh] md:max-h-full">
          <LeftPanel 
            stations={stations} 
            logs={logs} 
          />
        </div>

        {/* Center/Main Area: GPS Simulator & Map & Station Detail drawer */}
        <div className="md:col-span-3 flex flex-col gap-4 overflow-hidden h-full">
          
          {/* Simulator Control Bar */}
          <GpsSimulator 
            currentCoords={coords} 
            setCoords={setCoords} 
            addLog={addLog} 
          />

          {/* Map & Detail slide-out row */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden min-h-[400px]">
            
            {/* Interactive leaf Map (occupies 2/3 space by default, or full if no station open) */}
            <div className={`h-full transition-all duration-300 ${activeStation ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              
              {/* Filter controls floating inside map container header */}
              <div className="absolute top-[68px] right-8 z-[400] flex flex-wrap gap-2 max-w-sm sm:max-w-none">
                
                {/* Connector selector */}
                <div className="flex items-center gap-1 bg-dark-panel/90 backdrop-blur-md px-2 py-1 rounded border border-dark-border text-[10px] text-gray-300">
                  <Filter className="w-3 h-3 text-brand-cyan" />
                  Connector:
                  <select
                    value={connectorType}
                    onChange={(e) => setConnectorType(e.target.value)}
                    className="bg-transparent text-white font-semibold outline-none cursor-pointer text-[10px]"
                  >
                    <option value="" className="bg-dark-panel">All</option>
                    <option value="CCS2" className="bg-dark-panel">CCS2</option>
                    <option value="CCS1" className="bg-dark-panel">CCS1</option>
                    <option value="NACS" className="bg-dark-panel">NACS</option>
                    <option value="TYPE2" className="bg-dark-panel">TYPE 2</option>
                    <option value="CHAdeMO" className="bg-dark-panel">CHAdeMO</option>
                  </select>
                </div>

                {/* Recommender Sorting Toggle */}
                <button
                  onClick={() => {
                    setUseRecommender(!useRecommender);
                    addLog(
                      `[RECOMMENDER] Recommender custom ranking ${!useRecommender ? 'ENABLED' : 'DISABLED'}.`,
                      'info'
                    );
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[10px] font-bold transition-all ${
                    useRecommender
                      ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan shadow-glow'
                      : 'bg-dark-panel/90 border-dark-border text-gray-400'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Smart Recommendation
                </button>
              </div>

              <InteractiveMap 
                stations={stations} 
                userCoords={coords} 
                onSelectStation={handleSelectStation} 
                activeStationId={activeStation?.id}
              />
            </div>

            {/* Right Drawer: Station details and reporting panels */}
            {activeStation && (
              <div className="lg:col-span-1 h-full overflow-hidden">
                <StationDetail 
                  stationId={activeStation.id} 
                  onClose={() => setActiveStation(null)} 
                  userCoords={coords}
                  onReportSubmitted={handleReportSuccess}
                  addLog={addLog}
                />
              </div>
            )}

          </div>
        </div>

      </main>
    </div>
  );
};
