import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, Mail, Loader, Key, AlertCircle } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setLoading(true);

    try {
      await login(email, password);
      setLoading(false);
      navigate('/');
    } catch (err) {
      setLoading(false);
      setFormError(err.message || 'Login failed. Verify your email and password.');
    }
  };

  // Quick preset logins
  const handleQuickLogin = (presetEmail, presetPass) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setFormError('');
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background glowing cyber nodes */}
      <div className="absolute w-[400px] h-[400px] bg-brand-cyan/10 rounded-full blur-[120px] -top-32 -left-20"></div>
      <div className="absolute w-[300px] h-[300px] bg-brand-electric/15 rounded-full blur-[100px] -bottom-20 -right-10"></div>

      <div className="w-full max-w-md flex flex-col gap-4 z-10">
        
        {/* Logo Banner */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-dark-panel flex items-center justify-center mx-auto mb-3 border border-brand-cyan shadow-glow">
            <Shield className="w-6 h-6 text-brand-cyan" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            <span className="text-brand-cyan">🛡️ CHARGE</span>SENTINEL
          </h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold">
            EV RELIABILITY DASHBOARD SIGN-IN
          </p>
        </div>

        {/* Login Panel */}
        <div className="glass-panel rounded-xl p-6 border border-dark-border">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {formError && (
              <div className="p-3 bg-brand-rose/10 border border-brand-rose/30 text-brand-rose rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 font-semibold block mb-1.5 uppercase tracking-wider">
                Operator Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  required
                  placeholder="name@agency.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input rounded-lg pl-9 pr-4 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-semibold block mb-1.5 uppercase tracking-wider">
                Security Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input rounded-lg pl-9 pr-4 py-2 text-sm text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-cyan hover:bg-brand-cyanDark text-dark-bg font-bold py-2.5 rounded-lg text-sm transition duration-155 flex items-center justify-center gap-2 shadow-glow"
            >
              {loading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                'Access Dashboard'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-xs text-gray-400">
              New system analyst?{' '}
              <Link to="/register" className="text-brand-cyan hover:underline font-semibold">
                Register Credentials
              </Link>
            </span>
          </div>
        </div>

        {/* Developer Quick Preset sign-ins (Highly interactive & wows the user) */}
        <div className="glass-panel rounded-xl p-4 border border-dark-border">
          <div className="flex items-center gap-1.5 text-brand-cyan text-xs font-bold uppercase tracking-wider mb-2">
            <Key className="w-3.5 h-3.5" />
            Developer Quick Access presets
          </div>
          <p className="text-[10px] text-gray-400 mb-3">
            Click any profile node to populate credentials and test varying trust behaviors:
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@charger-admin.com', 'adminpassword')}
              className="flex justify-between items-center text-[10px] bg-dark-bg hover:bg-dark-panelLight border border-dark-border hover:border-brand-cyan p-2 rounded transition-all"
            >
              <span className="font-bold text-brand-cyan">🛡️ System Administrator</span>
              <span className="text-gray-500">Full control & spam moderation</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('elon@tesla.com', 'userpassword')}
              className="flex justify-between items-center text-[10px] bg-dark-bg hover:bg-dark-panelLight border border-dark-border hover:border-brand-emerald p-2 rounded transition-all"
            >
              <span className="font-bold text-brand-emerald">🟢 Elon Tesla (High-Trust User)</span>
              <span className="text-gray-500">Smoothed Laplace rating: 0.95</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('spammer.bot@gmail.com', 'userpassword')}
              className="flex justify-between items-center text-[10px] bg-dark-bg hover:bg-dark-panelLight border border-dark-border hover:border-brand-rose p-2 rounded transition-all"
            >
              <span className="font-bold text-brand-rose">🔴 Spammer Bot (Low Reputation)</span>
              <span className="text-gray-500">Laplace rating: 0.15</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
