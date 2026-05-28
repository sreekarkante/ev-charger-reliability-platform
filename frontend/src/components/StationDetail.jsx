import React, { useState, useEffect } from 'react';
import { stationService, reportService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Zap, Clock, ArrowRight, ShieldCheck, AlertTriangle, HelpCircle, 
  Car, Compass, Loader, CheckCircle, Flame 
} from 'lucide-react';

export const StationDetail = ({ stationId, onClose, userCoords, onReportSubmitted, addLog }) => {
  const { user } = useAuth();
  const [station, setStation] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [reportType, setReportType] = useState('WORKING');
  const [waitTime, setWaitTime] = useState(0);
  const [queueLength, setQueueLength] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', msg: '' });

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const data = await stationService.getById(stationId);
      setStation(data);
      setReports(data.reports || []);
      setLoading(false);
    } catch (err) {
      console.error('[DETAIL LOAD ERROR]', err);
      setFeedback({ type: 'error', msg: 'Failed to load station telemetry.' });
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stationId) {
      fetchDetails();
      setFeedback({ type: '', msg: '' });
    }
  }, [stationId]);

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    setFeedback({ type: '', msg: '' });

    try {
      addLog(`[SUBMISSION] Sending report... Coordinates: [${userCoords.lat.toFixed(5)}, ${userCoords.lng.toFixed(5)}]`, 'info');
      
      const payload = {
        station_id: stationId,
        report_type: reportType,
        queue_length: parseInt(queueLength),
        wait_time: parseInt(waitTime),
        gps_latitude: userCoords.lat,
        gps_longitude: userCoords.lng
      };

      const res = await reportService.submit(payload);
      
      setFeedback({ 
        type: 'success', 
        msg: `Report accepted! GPS Proximity verified. Consensus updated.` 
      });
      
      addLog(`[SUCCESS] Report submitted successfully! Station consensus: ${res.station.status} (Conf: ${Math.round(res.station.confidence_score * 100)}%).`, 'success');
      
      // Update local state and trigger parent refresh
      setStation(res.station);
      fetchDetails();
      onReportSubmitted(res.station);
    } catch (err) {
      console.error('[REPORT SUBMISSION ERROR]', err);
      setFeedback({ type: 'error', msg: err.message || 'Failed to submit report.' });
      addLog(`[REJECTED] Report failed: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!stationId) {
    return (
      <div className="glass-panel rounded-xl p-8 text-center text-gray-400 h-full flex flex-col justify-center border border-dark-border">
        <Compass className="w-12 h-12 text-brand-cyan/40 mx-auto mb-3 animate-bounce" />
        <p className="font-semibold text-white">No Telemetry Node Selected</p>
        <p className="text-xs text-gray-500 mt-1">Select a charging station marker on the map to monitor real-time status and file reliability reports.</p>
      </div>
    );
  }

  if (loading && !station) {
    return (
      <div className="glass-panel rounded-xl p-8 text-center text-gray-400 h-full flex flex-col justify-center items-center border border-dark-border">
        <Loader className="w-8 h-8 text-brand-cyan animate-spin mb-2" />
        <p className="text-xs">Connecting to Telemetry Node...</p>
      </div>
    );
  }

  // Visual status indicators mapping
  let statusColor = 'text-brand-amber';
  let statusBg = 'bg-brand-amber/10 border-brand-amber/30';
  let statusIcon = <HelpCircle className="w-5 h-5" />;

  if (station.status === 'VERIFIED_WORKING') {
    statusColor = 'text-brand-emerald';
    statusBg = 'bg-brand-emerald/10 border-brand-emerald/30';
    statusIcon = <CheckCircle className="w-5 h-5 text-brand-emerald" />;
  } else if (station.status === 'LIKELY_WORKING') {
    statusColor = 'text-brand-emerald/80';
    statusBg = 'bg-brand-emerald/5 border-brand-emerald/20';
    statusIcon = <CheckCircle className="w-5 h-5 text-brand-emerald/80" />;
  } else if (station.status === 'VERIFIED_BROKEN') {
    statusColor = 'text-brand-rose';
    statusBg = 'bg-brand-rose/10 border-brand-rose/30';
    statusIcon = <AlertTriangle className="w-5 h-5 text-brand-rose" />;
  } else if (station.status === 'LIKELY_BROKEN') {
    statusColor = 'text-brand-rose/80';
    statusBg = 'bg-brand-rose/5 border-brand-rose/20';
    statusIcon = <AlertTriangle className="w-5 h-5 text-brand-rose/80" />;
  }

  return (
    <div className="glass-panel rounded-xl border border-dark-border h-full flex flex-col overflow-hidden max-h-[85vh] md:max-h-full">
      {/* 1. Header with details */}
      <div className="p-4 border-b border-dark-border flex justify-between items-start bg-dark-bg/30">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">{station.name}</h2>
          <div className="flex gap-2 items-center text-[10px] text-gray-400 mt-1 font-mono">
            <span>{station.charger_type}</span>
            <span>•</span>
            <span>{station.connector_type}</span>
            <span>•</span>
            <span className="text-brand-cyan">{station.power_output} kW</span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white bg-dark-panelLight px-2 py-0.5 rounded text-xs border border-dark-border"
        >
          Close
        </button>
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Status Consensus Summary Banner */}
        <div className={`p-3 rounded-lg border flex gap-3 items-center ${statusBg}`}>
          {statusIcon}
          <div className="flex-1">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Consensus Status</div>
            <div className={`text-base font-extrabold ${statusColor}`}>
              {station.status.replace('_', ' ')}
            </div>
          </div>
          {station.status !== 'UNCERTAIN' && (
            <div className="text-right">
              <div className="text-[10px] text-gray-400">Confidence</div>
              <div className="text-sm font-extrabold text-white">
                {Math.round(station.confidence_score * 100)}%
              </div>
            </div>
          )}
        </div>

        {/* Real-time Queue wait estimate widget */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-dark-bg/60 border border-dark-border rounded-lg p-3 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-brand-cyan" />
            <div>
              <div className="text-[10px] text-gray-400">Est. Wait Time</div>
              <div className="text-sm font-bold text-white">
                {station.queue_estimate > 0 ? `${station.queue_estimate} min` : '0 min'}
              </div>
            </div>
          </div>

          <div className="bg-dark-bg/60 border border-dark-border rounded-lg p-3 flex items-center gap-2.5">
            <Car className="w-4 h-4 text-brand-electric" />
            <div>
              <div className="text-[10px] text-gray-400">Reporting Weight</div>
              <div className="text-sm font-bold text-white">
                {reports.length > 0 ? reports[0].weight.toFixed(2) : '1.00'}
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {feedback.msg && (
          <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
            feedback.type === 'success' 
              ? 'bg-brand-emerald/10 border-brand-emerald/40 text-brand-emerald' 
              : 'bg-brand-rose/10 border-brand-rose/40 text-brand-rose'
          }`}>
            {feedback.msg}
          </div>
        )}

        {/* Crowdsourced reporting form */}
        <div className="border-t border-dark-border pt-4">
          {!user ? (
            <div className="bg-dark-bg/40 border border-dashed border-dark-border rounded-lg p-4 text-center">
              <p className="text-xs text-gray-400 mb-2">You must be logged in to file charger telemetry reports.</p>
              <p className="text-[10px] text-gray-500 mb-2">GPS validation requires your simulated coordinate to be within 200m.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">File Telemetry Report</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReportType('WORKING')}
                  className={`py-2 px-3 text-xs rounded border transition-all ${
                    reportType === 'WORKING'
                      ? 'bg-brand-emerald/10 border-brand-emerald text-brand-emerald font-semibold'
                      : 'border-dark-border bg-dark-bg text-gray-400 hover:bg-dark-panel'
                  }`}
                >
                  🟢 Charging Operational
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('BROKEN')}
                  className={`py-2 px-3 text-xs rounded border transition-all ${
                    reportType === 'BROKEN'
                      ? 'bg-brand-rose/10 border-brand-rose text-brand-rose font-semibold'
                      : 'border-dark-border bg-dark-bg text-gray-400 hover:bg-dark-panel'
                  }`}
                >
                  🔴 Charger Offline/Broken
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
                    Queue Length (Cars)
                  </label>
                  <select
                    value={queueLength}
                    onChange={(e) => setQueueLength(e.target.value)}
                    className="w-full glass-input rounded p-1.5 text-xs text-white"
                  >
                    <option value={0}>0 cars waiting</option>
                    <option value={1}>1 car waiting</option>
                    <option value={2}>2 cars waiting</option>
                    <option value={3}>3+ cars waiting</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
                    Est. Wait: <span className="text-brand-cyan font-bold">{waitTime} min</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={5}
                    value={waitTime}
                    onChange={(e) => setWaitTime(e.target.value)}
                    className="w-full h-1 bg-dark-border rounded-lg appearance-none cursor-pointer accent-brand-cyan mt-3"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand-cyan hover:bg-brand-cyanDark text-dark-bg font-bold py-2 rounded text-xs transition duration-150 flex items-center justify-center gap-1.5 shadow-glow"
              >
                {isSubmitting ? (
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    Submit Verified Telemetry
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* 15 Recent telemetry history log */}
        <div className="border-t border-dark-border pt-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5">Telemetry History</h3>
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {reports.length === 0 ? (
              <p className="text-[11px] text-gray-500 italic">No report history available. Be the first to report.</p>
            ) : (
              reports.map((rep) => {
                let badgeColor = 'bg-brand-amber/10 text-brand-amber border-brand-amber/20';
                if (rep.status === 'VERIFIED') badgeColor = 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/20';
                if (rep.status === 'CONFLICTED') badgeColor = 'bg-brand-rose/10 text-brand-rose border-brand-rose/20';

                const isWorking = rep.report_type.includes('WORKING');
                const timeStr = new Date(rep.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={rep.id} className="bg-dark-bg/40 border border-dark-border rounded p-2 text-[10px] space-y-1">
                    <div className="flex justify-between items-center">
                      <span className={`font-bold uppercase ${isWorking ? 'text-brand-emerald' : 'text-brand-rose'}`}>
                        {isWorking ? '🟢 Working' : '🔴 Broken'}
                      </span>
                      <span className={`border px-1 rounded text-[8px] ${badgeColor}`}>
                        {rep.status}
                      </span>
                    </div>

                    <div className="flex justify-between text-gray-400">
                      <span>By: <span className="text-gray-200 font-semibold">{rep.user.name}</span> (trust: {rep.user.trust_score.toFixed(2)})</span>
                      <span>Weight Applied: <span className="text-brand-cyan font-bold font-mono">{rep.weight.toFixed(2)}</span></span>
                    </div>

                    {rep.wait_time > 0 && (
                      <div className="text-brand-electric font-semibold">
                        ⏱️ Est Queue Wait: {rep.wait_time} mins ({rep.queue_length} cars)
                      </div>
                    )}

                    <div className="text-right text-[9px] text-gray-500">
                      Filed at: {timeStr}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
