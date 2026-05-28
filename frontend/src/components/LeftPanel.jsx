import React, { useRef, useEffect } from 'react';
import { Activity, ShieldCheck, Timer, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';

export const LeftPanel = ({ stats, stations, logs }) => {
  const logContainerRef = useRef(null);

  // Compute live aggregates from loaded stations
  const activeStations = stations.length;
  const workingCount = stations.filter(s => s.status.includes('WORKING')).length;
  const brokenCount = stations.filter(s => s.status.includes('BROKEN')).length;
  const uncertainCount = stations.filter(s => s.status === 'UNCERTAIN').length;

  const pctWorking = activeStations > 0 
    ? Math.round((workingCount / activeStations) * 100) 
    : 0;

  const avgWait = activeStations > 0
    ? Math.round(stations.reduce((acc, s) => acc + s.queue_estimate, 0) / activeStations * 10) / 10
    : 0;

  // Auto scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* 1. Brand Header */}
      <div className="glass-panel rounded-xl p-4 flex items-center justify-between border-t-2 border-brand-cyan shadow-glow">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans flex items-center gap-1.5">
            <span className="text-brand-cyan">🛡️ CHARGE</span>SENTINEL
          </h1>
          <p className="text-[10px] text-brand-cyan tracking-widest uppercase font-semibold">
            EV Reliability Operations
          </p>
        </div>
        <div className="flex items-center gap-1 bg-dark-bg px-2 py-1 rounded text-[11px] border border-dark-border text-brand-emerald">
          <Activity className="w-3.5 h-3.5 pulse-dot" />
          ONLINE
        </div>
      </div>

      {/* 2. Key Aggregate Metrics */}
      <div className="grid grid-cols-2 gap-3">
        {/* Metric A */}
        <div className="glass-panel rounded-xl p-3 flex flex-col justify-between">
          <div className="flex justify-between items-start text-gray-400">
            <span className="text-xs font-semibold">Total Chargers</span>
            <ShieldCheck className="w-4 h-4 text-brand-cyan" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-white">{activeStations}</div>
            <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-brand-emerald inline-block"></span> {workingCount} Working
            </div>
          </div>
        </div>

        {/* Metric B */}
        <div className="glass-panel rounded-xl p-3 flex flex-col justify-between">
          <div className="flex justify-between items-start text-gray-400">
            <span className="text-xs font-semibold">Uptime Ratio</span>
            <RefreshCw className="w-4 h-4 text-brand-emerald" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-brand-emerald">{pctWorking}%</div>
            <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-brand-rose inline-block"></span> {brokenCount} Broken
            </div>
          </div>
        </div>

        {/* Metric C */}
        <div className="glass-panel rounded-xl p-3 flex flex-col justify-between col-span-2">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-xs font-semibold">System-wide Average Queue</span>
            <Timer className="w-4 h-4 text-brand-electric" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{avgWait}</span>
            <span className="text-xs text-gray-400">minutes waiting</span>
          </div>
        </div>
      </div>

      {/* 3. Real-Time Telemetry Event Log */}
      <div className="glass-panel rounded-xl p-4 flex-1 flex flex-col overflow-hidden min-h-[250px]">
        <div className="flex items-center justify-between pb-3 border-b border-dark-border mb-3">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-brand-cyan" />
            Live Telemetry Feed
          </div>
          <span className="text-[10px] bg-dark-bg text-gray-400 px-1.5 py-0.5 rounded border border-dark-border">
            {logs.length} events
          </span>
        </div>

        <div 
          ref={logContainerRef}
          className="flex-1 overflow-y-auto space-y-2.5 pr-1"
        >
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <div className="w-8 h-8 rounded-full bg-dark-panel flex items-center justify-center text-gray-500 mb-2 border border-dark-border">
                <AlertCircle className="w-4 h-4" />
              </div>
              <p className="text-xs text-gray-500">Awaiting live report broadcasts...</p>
            </div>
          ) : (
            logs.map((log) => {
              let icon = <AlertCircle className="w-3.5 h-3.5 text-brand-cyan flex-shrink-0" />;
              let cardStyle = 'border-dark-border bg-dark-bg/40';

              if (log.type === 'error') {
                icon = <AlertTriangle className="w-3.5 h-3.5 text-brand-rose flex-shrink-0" />;
                cardStyle = 'border-brand-rose/30 bg-brand-rose/5';
              } else if (log.type === 'warn') {
                icon = <AlertTriangle className="w-3.5 h-3.5 text-brand-amber flex-shrink-0" />;
                cardStyle = 'border-brand-amber/30 bg-brand-amber/5';
              } else if (log.type === 'success') {
                icon = <ShieldCheck className="w-3.5 h-3.5 text-brand-emerald flex-shrink-0" />;
                cardStyle = 'border-brand-emerald/30 bg-brand-emerald/5';
              }

              return (
                <div 
                  key={log.id} 
                  className={`p-2.5 rounded border text-[11px] flex gap-2 leading-relaxed transition-all duration-300 ${cardStyle}`}
                >
                  {icon}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="text-gray-400 font-mono text-[9px]">{log.time}</span>
                    </div>
                    <p className="text-gray-200">{log.text}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
