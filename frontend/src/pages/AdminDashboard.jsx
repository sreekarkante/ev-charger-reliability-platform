import React, { useState, useEffect } from 'react';
import { adminService, stationService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  ShieldAlert, Users, Zap, Shield, ChevronLeft, Loader, 
  Trash2, Plus, Ban, CheckCircle, Clock 
} from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect non-admins
  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/');
    }
  }, [user, navigate]);

  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', msg: '' });

  // Data states
  const [systemStats, setSystemStats] = useState(null);
  const [stationStats, setStationStats] = useState([]);
  const [userStats, setUserStats] = useState(null);

  // New station form states
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [chargerType, setChargerType] = useState('DC_FAST');
  const [connectorType, setConnectorType] = useState('CCS2');
  const [powerOutput, setPowerOutput] = useState('150');
  const [isCreatingStation, setIsCreatingStation] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const statsRes = await adminService.getSystemStats();
      const stationsRes = await adminService.getStationStats();
      const usersRes = await adminService.getUserStats();

      setSystemStats(statsRes);
      setStationStats(stationsRes.allStationsSummary || []);
      setUserStats(usersRes);
      setLoading(false);
    } catch (err) {
      console.error('[ADMIN FETCH ERROR]', err);
      setFeedback({ type: 'error', msg: 'Failed to synchronize administration intelligence records.' });
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateUserStatus = async (userId, newStatus) => {
    try {
      const res = await adminService.updateUserStatus(userId, newStatus, 24);
      setFeedback({ type: 'success', msg: res.message });
      loadData(); // Reload stats
    } catch (err) {
      console.error('[STATUS UPDATE ERROR]', err);
      setFeedback({ type: 'error', msg: err.message || 'Failed to update user reputation status.' });
    }
  };

  const handleDeleteStation = async (stationId) => {
    if (!window.confirm('Are you sure you want to decommission this charging station?')) return;
    try {
      await stationService.delete(stationId);
      setFeedback({ type: 'success', msg: 'Charging station successfully decommissioned.' });
      loadData();
    } catch (err) {
      console.error('[DELETE STATION ERROR]', err);
      setFeedback({ type: 'error', msg: 'Decommissioning failed.' });
    }
  };

  const handleCreateStation = async (e) => {
    e.preventDefault();
    setIsCreatingStation(true);
    setFeedback({ type: '', msg: '' });

    try {
      await stationService.create({
        name,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        charger_type: chargerType,
        connector_type: connectorType,
        power_output: parseFloat(powerOutput)
      });

      setFeedback({ type: 'success', msg: 'New charging node initialized in regional network.' });
      // Reset form
      setName('');
      setLat('');
      setLng('');
      loadData();
    } catch (err) {
      console.error('[CREATE STATION ERROR]', err);
      setFeedback({ type: 'error', msg: err.message || 'Failed to create charging node.' });
    } finally {
      setIsCreatingStation(false);
    }
  };

  if (loading && !systemStats) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col justify-center items-center text-gray-400">
        <Loader className="w-8 h-8 text-brand-cyan animate-spin mb-2" />
        <p className="text-xs font-mono uppercase tracking-widest text-brand-cyan">Opening Command Node...</p>
      </div>
    );
  }

  // Bins for User trust distribution
  const chartData = userStats ? [
    { name: 'Suspicious (0-0.19)', count: userStats.trustDistribution.suspicious, fill: '#EF4444' },
    { name: 'Low (0.2-0.49)', count: userStats.trustDistribution.lowTrust, fill: '#F59E0B' },
    { name: 'Medium (0.5-0.79)', count: userStats.trustDistribution.mediumTrust, fill: '#3B82F6' },
    { name: 'High (0.8-1.0)', count: userStats.trustDistribution.highTrust, fill: '#10B981' }
  ] : [];

  return (
    <div className="min-h-screen bg-dark-bg text-gray-200 p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col h-full gap-4">
        
        {/* Navigation / Header */}
        <div className="flex justify-between items-center bg-dark-panel p-4 rounded-xl border border-dark-border shadow-glass">
          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="flex items-center gap-1 text-xs font-semibold bg-dark-panelLight hover:bg-dark-border border border-dark-border px-2.5 py-1 rounded text-brand-cyan transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Live Map
            </Link>
            <div>
              <h1 className="text-lg font-extrabold text-white flex items-center gap-1.5 leading-none">
                <Shield className="w-5 h-5 text-brand-cyan" />
                Sentinel command Operations
              </h1>
              <span className="text-[10px] text-brand-cyan uppercase tracking-widest font-semibold mt-1 inline-block">
                Administrative System Panel
              </span>
            </div>
          </div>
          
          <div className="text-right hidden sm:block">
            <div className="text-xs text-white font-bold">{user?.name}</div>
            <div className="text-[10px] text-gray-500 font-mono">Operator ID: {user?.id.slice(0, 8)}...</div>
          </div>
        </div>

        {/* System aggregate feedback */}
        {feedback.msg && (
          <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
            feedback.type === 'success' 
              ? 'bg-brand-emerald/10 border-brand-emerald/40 text-brand-emerald' 
              : 'bg-brand-rose/10 border-brand-rose/40 text-brand-rose'
          }`}>
            {feedback.msg}
          </div>
        )}

        {/* Module Subtabs */}
        <div className="flex border-b border-dark-border gap-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2.5 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'users'
                ? 'border-brand-cyan text-brand-cyan bg-brand-cyan/5'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            Reputation & Moderation
          </button>
          <button
            onClick={() => setActiveTab('stations')}
            className={`py-2.5 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'stations'
                ? 'border-brand-cyan text-brand-cyan bg-brand-cyan/5'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            Charging Nodes Grid
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2.5 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'logs'
                ? 'border-brand-cyan text-brand-cyan bg-brand-cyan/5'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            Security & Anti-Abuse logs
          </button>
        </div>

        {/* TAB 1: USER REPUTATION MODERATION */}
        {activeTab === 'users' && userStats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart Widget Left */}
            <div className="glass-panel rounded-xl p-4 border border-dark-border flex flex-col gap-3 lg:col-span-1 min-h-[300px]">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-dark-border pb-2">
                User Trust Score Distribution
              </h3>
              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={9} tickLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={10} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#151D30', borderColor: '#2C3A5A' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* User List Right */}
            <div className="glass-panel rounded-xl p-4 border border-dark-border lg:col-span-2 flex flex-col">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-dark-border pb-2 mb-3">
                Operator Reputation Register ({userStats.totalUsers} users)
              </h3>
              <div className="overflow-x-auto flex-1 max-h-[350px]">
                <table className="w-full text-[11px] text-left text-gray-300">
                  <thead className="text-[10px] uppercase bg-dark-bg text-gray-400 font-mono border-b border-dark-border">
                    <tr>
                      <th className="px-4 py-2">Operator Name</th>
                      <th className="px-4 py-2">Security Status</th>
                      <th className="px-4 py-2 text-center">Laplace Trust</th>
                      <th className="px-4 py-2 text-center">Reports Filed</th>
                      <th className="px-4 py-2 text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border/40">
                    {userStats.usersList.map((usr) => {
                      let statusBadge = 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/30';
                      if (usr.account_status === 'SUSPENDED') statusBadge = 'bg-brand-rose/10 text-brand-rose border-brand-rose/30';
                      if (usr.account_status === 'COOLDOWN') statusBadge = 'bg-brand-amber/10 text-brand-amber border-brand-amber/30';

                      return (
                        <tr key={usr.id} className="hover:bg-dark-panelLight/40 transition">
                          <td className="px-4 py-2.5">
                            <div className="font-bold text-white">{usr.name}</div>
                            <div className="text-[9px] text-gray-500 font-mono">{usr.email}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`border px-1.5 py-0.5 rounded font-mono text-[9px] ${statusBadge}`}>
                              {usr.account_status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold font-mono text-brand-cyan">
                            {usr.trust_score.toFixed(3)}
                          </td>
                          <td className="px-4 py-2.5 text-center text-white font-mono">
                            {usr.total_reports} <span className="text-gray-500">({usr.verified_correct_reports} ok)</span>
                          </td>
                          <td className="px-4 py-2.5 text-right space-x-1.5">
                            {usr.account_status !== 'SUSPENDED' ? (
                              <button
                                onClick={() => handleUpdateUserStatus(usr.id, 'SUSPENDED')}
                                className="bg-brand-rose/10 hover:bg-brand-rose text-brand-rose hover:text-white px-2 py-0.5 rounded border border-brand-rose/30 transition text-[10px] inline-flex items-center gap-1 font-semibold"
                              >
                                <Ban className="w-3 h-3" /> Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateUserStatus(usr.id, 'ACTIVE')}
                                className="bg-brand-emerald/10 hover:bg-brand-emerald text-brand-emerald hover:text-white px-2 py-0.5 rounded border border-brand-emerald/30 transition text-[10px] inline-flex items-center gap-1 font-semibold"
                              >
                                <CheckCircle className="w-3 h-3" /> Lift Ban
                              </button>
                            )}
                            {usr.account_status === 'COOLDOWN' && (
                              <button
                                onClick={() => handleUpdateUserStatus(usr.id, 'ACTIVE')}
                                className="bg-brand-emerald/10 hover:bg-brand-emerald text-brand-emerald hover:text-white px-2 py-0.5 rounded border border-brand-emerald/30 transition text-[10px] inline-flex items-center gap-1 font-semibold"
                              >
                                <CheckCircle className="w-3 h-3" /> End Cooldown
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: STATION MANAGEMENT */}
        {activeTab === 'stations' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Create Station Node Left */}
            <div className="glass-panel rounded-xl p-4 border border-dark-border lg:col-span-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-dark-border pb-2 mb-3">
                Deploy New Telemetry Node
              </h3>
              <form onSubmit={handleCreateStation} className="space-y-3.5">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
                    Station Node Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Signature Plaza Supercharger"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full glass-input rounded p-1.5 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="12.9592"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="w-full glass-input rounded p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="77.6444"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="w-full glass-input rounded p-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
                      Charger Mode
                    </label>
                    <select
                      value={chargerType}
                      onChange={(e) => setChargerType(e.target.value)}
                      className="w-full glass-input rounded p-1.5 text-xs text-white"
                    >
                      <option value="DC_FAST">DC FAST</option>
                      <option value="AC">AC CHARGE</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
                      Connector Type
                    </label>
                    <select
                      value={connectorType}
                      onChange={(e) => setConnectorType(e.target.value)}
                      className="w-full glass-input rounded p-1.5 text-xs text-white"
                    >
                      <option value="CCS2">CCS2 (Recommended)</option>
                      <option value="CCS1">CCS1</option>
                      <option value="NACS">NACS (Tesla)</option>
                      <option value="TYPE2">TYPE 2</option>
                      <option value="CHAdeMO">CHAdeMO</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
                    Power Output Rating (kW)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="150"
                    value={powerOutput}
                    onChange={(e) => setPowerOutput(e.target.value)}
                    className="w-full glass-input rounded p-1.5 text-xs text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingStation}
                  className="w-full bg-brand-cyan hover:bg-brand-cyanDark text-dark-bg font-bold py-2 rounded text-xs transition duration-150 flex items-center justify-center gap-1.5 shadow-glow"
                >
                  {isCreatingStation ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Initialize Grid Node
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Station grid status table Right */}
            <div className="glass-panel rounded-xl p-4 border border-dark-border lg:col-span-2 flex flex-col">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-dark-border pb-2 mb-3">
                Active Node Grid Registry
              </h3>
              <div className="overflow-x-auto max-h-[350px]">
                <table className="w-full text-[11px] text-left text-gray-300">
                  <thead className="text-[10px] uppercase bg-dark-bg text-gray-400 font-mono border-b border-dark-border">
                    <tr>
                      <th className="px-3 py-2">Node Name</th>
                      <th className="px-3 py-2">Telemetry Spec</th>
                      <th className="px-3 py-2">Consensus State</th>
                      <th className="px-3 py-2 text-center">Confidence</th>
                      <th className="px-3 py-2 text-center">Reports</th>
                      <th className="px-3 py-2 text-right">Admin Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border/40">
                    {stationStats.map((st) => {
                      let color = 'text-brand-amber';
                      if (st.status.includes('WORKING')) color = 'text-brand-emerald';
                      if (st.status.includes('BROKEN')) color = 'text-brand-rose';

                      return (
                        <tr key={st.id} className="hover:bg-dark-panelLight/40 transition">
                          <td className="px-3 py-2.5 font-bold text-white">{st.name}</td>
                          <td className="px-3 py-2.5 text-gray-400 font-mono text-[9px]">
                            {st.chargerType} • {st.connectorType} • <span className="text-brand-cyan">{st.powerOutput}kW</span>
                          </td>
                          <td className={`px-3 py-2.5 font-bold font-mono text-[9px] ${color}`}>
                            {st.status.replace('_', ' ')}
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-white font-mono">
                            {st.status !== 'UNCERTAIN' ? `${Math.round(st.confidence * 100)}%` : '0%'}
                          </td>
                          <td className="px-3 py-2.5 text-center text-white font-mono">{st.reportsCount}</td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              onClick={() => handleDeleteStation(st.id)}
                              className="bg-brand-rose/10 hover:bg-brand-rose text-brand-rose hover:text-white p-1 rounded border border-brand-rose/30 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: SPAM & ABUSE LOGS */}
        {activeTab === 'logs' && systemStats && (
          <div className="glass-panel rounded-xl p-4 border border-dark-border flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-dark-border mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                System Security logs & Flag Records
              </h3>
              <span className="text-[9px] bg-dark-bg text-brand-rose font-mono px-2 py-0.5 rounded border border-brand-rose/20">
                Spam protection active
              </span>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {systemStats.recentLogs.filter(log => log.event_type === 'SUSPICIOUS_ACTIVITY' || log.event_type === 'ABUSE_BAN').length === 0 ? (
                <div className="text-center p-8 text-gray-500 italic text-xs">
                  No security alerts or spoofer infractions have been registered in logs.
                </div>
              ) : (
                systemStats.recentLogs
                  .filter(log => log.event_type === 'SUSPICIOUS_ACTIVITY' || log.event_type === 'ABUSE_BAN')
                  .map((log) => {
                    const isBan = log.event_type === 'ABUSE_BAN';
                    const timeStr = new Date(log.created_at).toLocaleString();

                    return (
                      <div 
                        key={log.id} 
                        className={`p-3 rounded border text-xs leading-relaxed ${
                          isBan 
                            ? 'bg-brand-rose/15 border-brand-rose/35 text-brand-rose' 
                            : 'bg-brand-amber/10 border-brand-amber/30 text-brand-amber'
                        }`}
                      >
                        <div className="flex justify-between items-start font-mono text-[9px] text-gray-400 mb-1">
                          <span>Event: {log.event_type}</span>
                          <span>{timeStr}</span>
                        </div>
                        <div className="font-bold text-white">
                          Target Account: <span className="font-mono text-brand-cyan">{log.metadata.email || log.metadata.targetUserEmail}</span>
                        </div>
                        <p className="mt-1 text-gray-300">
                          {isBan ? (
                            `Administrative BAN: User was permanently blacklisted. Reason: ${log.metadata.reason}`
                          ) : (
                            `Antifraud Infraction Flag: Detected remote spoofing coordinate travel speed of ${log.metadata.calculatedSpeedKmh} km/h (Limit: 150 km/h) over a distance of ${log.metadata.distanceMeters} meters.`
                          )}
                        </p>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
