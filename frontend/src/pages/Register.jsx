import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, Mail, Loader, User, AlertCircle } from 'lucide-react';

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setLoading(true);

    try {
      await register(name, email, password);
      setLoading(false);
      navigate('/');
    } catch (err) {
      setLoading(false);
      setFormError(err.message || 'Registration failed. Check if email exists.');
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute w-[400px] h-[400px] bg-brand-cyan/10 rounded-full blur-[120px] -top-32 -left-20"></div>
      <div className="absolute w-[300px] h-[300px] bg-brand-electric/15 rounded-full blur-[100px] -bottom-20 -right-10"></div>

      <div className="w-full max-w-md flex flex-col gap-4 z-10">
        
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-dark-panel flex items-center justify-center mx-auto mb-3 border border-brand-cyan shadow-glow">
            <Shield className="w-6 h-6 text-brand-cyan" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            <span className="text-brand-cyan">🛡️ CHARGE</span>SENTINEL
          </h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold">
            Create System Credentials
          </p>
        </div>

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
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input rounded-lg pl-9 pr-4 py-2 text-sm text-white"
                />
              </div>
            </div>

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
              <p className="text-[9px] text-gray-500 mt-1">
                Tip: Signing up with an email containing <span className="text-brand-cyan">@charger-admin.com</span> or starting with <span className="text-brand-cyan">admin@</span> will auto-grant Admin status!
              </p>
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
                  placeholder="•••••••• (6+ characters)"
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
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-xs text-gray-400">
              Already have credentials?{' '}
              <Link to="/login" className="text-brand-cyan hover:underline font-semibold">
                Sign In
              </Link>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
