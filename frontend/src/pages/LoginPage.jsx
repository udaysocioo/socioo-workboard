import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Lock, Mail, ArrowRight, CheckCircle, Shield, User } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [tab, setTab] = useState('employee'); // 'employee' or 'admin'

  // Admin state
  const [pin, setPin] = useState('');
  const [step, setStep] = useState(1);
  const [selectedUser, setSelectedUser] = useState('');

  // Employee state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { verifyPin, login, employeeLogin, users } = useAuthStore();

  // ── Admin PIN flow ──
  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (!pin) return toast.error('Enter the PIN');
    setLoading(true);
    try {
      const result = await verifyPin(pin);
      if (result.success && result.users?.length > 0) {
        setSelectedUser(result.users[0]._id);
        setStep(2);
        toast.success('PIN verified! Select your account.');
      } else {
        toast.error(result.error || 'Invalid PIN');
      }
    } catch {
      toast.error('Server unreachable. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!selectedUser) return toast.error('Select a user');
    setLoading(true);
    try {
      const { success, error } = await login(pin, selectedUser);
      if (success) {
        toast.success('Welcome back!');
        navigate('/');
      } else {
        toast.error(error || 'Login failed');
      }
    } catch {
      toast.error('Login error');
    } finally {
      setLoading(false);
    }
  };

  // ── Employee email/password flow ──
  const handleEmployeeLogin = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Enter your email');
    if (!password) return toast.error('Enter your password');
    setLoading(true);
    try {
      const { success, error } = await employeeLogin(email, password);
      if (success) {
        toast.success('Welcome back!');
        navigate('/');
      } else {
        toast.error(error || 'Login failed');
      }
    } catch {
      toast.error('Server unreachable. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  // Reset state when switching tabs
  const switchTab = (newTab) => {
    setTab(newTab);
    setPin('');
    setStep(1);
    setSelectedUser('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-[30%] -right-[10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-[#111] p-8 rounded-2xl shadow-2xl w-full max-w-md border border-zinc-800 relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src="/socioo-logo.png" alt="Socioo" className="w-10 h-10 object-contain" />
            <h1 className="ml-3 text-3xl font-bold text-white">
              <span className="font-display tracking-wide">SOCIOO</span>
            </h1>
          </div>
          <p className="text-lg text-zinc-300 font-medium">Workboard</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#0a0a0a] rounded-lg p-1 mb-6 border border-zinc-800">
          <button
            onClick={() => switchTab('employee')}
            className={`flex-1 flex items-center justify-center py-2.5 rounded-md text-sm font-medium transition-all ${
              tab === 'employee'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <User size={16} className="mr-2" />
            Employee
          </button>
          <button
            onClick={() => switchTab('admin')}
            className={`flex-1 flex items-center justify-center py-2.5 rounded-md text-sm font-medium transition-all ${
              tab === 'admin'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield size={16} className="mr-2" />
            Admin
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* ── EMPLOYEE TAB ── */}
          {tab === 'employee' && (
            <motion.form
              key="employee"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleEmployeeLogin}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@socioo.in"
                    className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />}
              </button>

              <p className="text-center text-xs text-zinc-500 mt-4">
                Don't have credentials? Contact your admin.
              </p>
            </motion.form>
          )}

          {/* ── ADMIN TAB ── */}
          {tab === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 ? (
                <form onSubmit={handlePinSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Enter Admin PIN
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="Enter PIN to continue"
                        className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none"
                        maxLength={10}
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                  >
                    {loading ? 'Verifying...' : 'Verify PIN'}
                    {!loading && <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleAdminLogin} className="space-y-5">
                  <div className="flex items-center space-x-2 text-green-400 text-sm mb-2">
                    <CheckCircle size={16} />
                    <span>PIN verified</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Select Your Account
                    </label>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {users.map((u) => (
                        <label
                          key={u._id}
                          className={`flex items-center p-3 rounded-lg cursor-pointer transition-all border ${
                            selectedUser === u._id
                              ? 'bg-blue-600/20 border-blue-500'
                              : 'bg-[#0a0a0a] border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="user"
                            value={u._id}
                            checked={selectedUser === u._id}
                            onChange={() => setSelectedUser(u._id)}
                            className="sr-only"
                          />
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 flex-shrink-0"
                            style={{ backgroundColor: u.avatarColor || '#6366f1' }}
                          >
                            {u.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium text-sm">{u.name}</p>
                            <p className="text-zinc-400 text-xs">{u.role}</p>
                          </div>
                          {selectedUser === u._id && (
                            <CheckCircle size={18} className="text-blue-400" />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => { setStep(1); setPin(''); }}
                      className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-3 px-4 rounded-lg transition-colors border border-zinc-800"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                    >
                      {loading ? 'Logging in...' : 'Access Workspace'}
                      {!loading && <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 text-center text-xs text-zinc-500">
          <p>Protected System. Authorized Personnel Only.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
