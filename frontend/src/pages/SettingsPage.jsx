import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import {
  Lock, Bell, Monitor, Users, Plus, Pencil, Trash2, X, Eye, EyeOff,
  UserPlus, Key, Save, Shield, Camera, Download, AlertTriangle, LogOut,
  Sun, Moon, Palette,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import PageTransition from '../components/common/PageTransition';
import { getTheme, setTheme as applyTheme } from '../lib/theme';

const SettingsSection = ({ title, icon: Icon, children }) => (
  <div className="bg-[#111] rounded-xl p-6 border border-zinc-800 mb-6">
    <h3 className="text-lg font-bold text-white mb-4 border-b border-zinc-800 pb-2 flex items-center">
      {Icon && <Icon size={20} className="mr-2 text-zinc-400" />}
      {title}
    </h3>
    <div className="space-y-4">{children}</div>
  </div>
);

// ── Change PIN Modal ──
const ChangePinModal = ({ onClose }) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPin !== confirmPin) return toast.error('New PINs do not match');
    if (newPin.length < 4) return toast.error('PIN must be at least 4 characters');
    setLoading(true);
    try {
      await api.put('/auth/pin', { currentPin, newPin });
      toast.success('Admin PIN updated successfully');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111] rounded-xl border border-zinc-800 w-full max-w-sm p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Change Admin PIN</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Current PIN</label>
            <input type="password" value={currentPin} onChange={(e) => setCurrentPin(e.target.value)}
              className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter current PIN" />
          </div>
          <div>
            <label className="block text-sm text-zinc-300 mb-1">New PIN</label>
            <input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)}
              className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter new PIN (min 4 chars)" />
          </div>
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Confirm New PIN</label>
            <input type="password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)}
              className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Confirm new PIN" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Updating...' : 'Update PIN'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Member Form Modal (Add/Edit) ──
const MemberFormModal = ({ member, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: member?.name || '',
    email: member?.email || '',
    role: member?.role || '',
    password: '',
    avatarColor: member?.avatarColor || '#3b82f6',
    isAdmin: member?.isAdmin || false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEdit = !!member;

  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    if (!form.email.trim()) return toast.error('Email is required');
    if (!form.role.trim()) return toast.error('Role is required');
    if (!isEdit && !form.password) return toast.error('Password is required for new members');

    setLoading(true);
    try {
      const payload = { name: form.name, email: form.email, role: form.role, avatarColor: form.avatarColor, isAdmin: form.isAdmin };
      if (form.password) payload.password = form.password;

      if (isEdit) {
        const res = await api.put(`/users/${member.id || member._id}`, payload);
        toast.success(`${res.data.name} updated`);
        onSave(res.data, 'update');
      } else {
        const res = await api.post('/users', payload);
        toast.success(`${res.data.name} added to team`);
        onSave(res.data, 'create');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111] rounded-xl border border-zinc-800 w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">{isEdit ? 'Edit Member' : 'Add New Member'}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Color */}
          <div className="flex items-center space-x-4 mb-2">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ backgroundColor: form.avatarColor }}>
              {form.name.charAt(0) || '?'}
            </div>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, avatarColor: c })}
                  className={`w-7 h-7 rounded-full transition-all ${form.avatarColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111]' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Full Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="John Doe" />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="john@socioo.in" />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Role / Job Title</label>
            <input type="text" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. CRM, Tech Lead, Designer" />
          </div>

          {/* Admin Toggle */}
          <div className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-lg border border-zinc-800">
            <div>
              <p className="text-sm font-medium text-zinc-200">Admin Access</p>
              <p className="text-xs text-zinc-500">Can manage team, change PIN, and access all settings</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.isAdmin} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })}
                className="sr-only peer" />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-zinc-300 mb-1">
              {isEdit ? 'New Password (leave blank to keep)' : 'Password'}
            </label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full p-2.5 pr-10 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={isEdit ? 'Leave blank to keep current' : 'Set login password'} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-2.5 rounded-lg transition-colors border border-zinc-800">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Member')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Delete Confirmation ──
const DeleteConfirmModal = ({ member, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/users/${member.id || member._id}`);
      toast.success(`${member.name} has been deactivated`);
      onConfirm(member.id || member._id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111] rounded-xl border border-zinc-800 w-full max-w-sm p-6 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={24} className="text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Remove {member.name}?</h3>
        <p className="text-sm text-zinc-400 mb-6">This will deactivate their account. They won't be able to log in.</p>
        <div className="flex space-x-3">
          <button onClick={onClose}
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-2.5 rounded-lg border border-zinc-800">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg disabled:opacity-50">
            {loading ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Main Settings Page ──
const SettingsPage = () => {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.isAdmin === true;

  // Profile state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Notification prefs
  const defaultPrefs = { inApp: true, taskAssigned: true, taskDone: true, commentAdded: true, taskOverdue: true, mentioned: true };
  const [notifPrefs, setNotifPrefs] = useState(defaultPrefs);
  const [prefsSaving, setPrefsSaving] = useState(false);

  // Danger zone
  const [deactivateConfirm, setDeactivateConfirm] = useState('');
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  // Team management
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);

  // Modals
  const [showPinModal, setShowPinModal] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [deleteMember, setDeleteMember] = useState(null);

  // Load notification prefs from user
  useEffect(() => {
    if (user?.notificationPrefs && typeof user.notificationPrefs === 'object') {
      setNotifPrefs({ ...defaultPrefs, ...user.notificationPrefs });
    }
  }, [user]);

  // Fetch team members (admin only)
  useEffect(() => {
    if (!isAdmin) { setMembersLoading(false); return; }
    const fetchMembers = async () => {
      try {
        const res = await api.get('/users');
        setMembers(res.data);
      } catch { /* ignore */ } finally {
        setMembersLoading(false);
      }
    };
    fetchMembers();
  }, [isAdmin]);

  // Save profile name
  const handleSaveProfile = async () => {
    if (!profileName.trim()) return toast.error('Name cannot be empty');
    setProfileSaving(true);
    try {
      const res = await api.put(`/users/${user.id || user._id}`, { name: profileName });
      useAuthStore.setState({ user: { ...user, name: res.data.name } });
      toast.success('Profile updated');
    } catch {
      // api interceptor handles most errors
    } finally {
      setProfileSaving(false);
    }
  };

  // Avatar upload with preview
  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Image must be under 2MB');
    if (!file.type.startsWith('image/')) return toast.error('Only images accepted');
    setAvatarPreview({ file, url: URL.createObjectURL(file) });
  };

  const handleAvatarUpload = async () => {
    if (!avatarPreview?.file) return;
    setProfileSaving(true);
    const formData = new FormData();
    formData.append('file', avatarPreview.file);
    try {
      const res = await api.post(`/users/${user.id || user._id}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      useAuthStore.setState({ user: { ...user, avatarUrl: res.data.avatarUrl, profilePicture: res.data.avatarUrl } });
      setAvatarPreview(null);
      toast.success('Avatar updated!');
    } catch {
      toast.error('Upload failed');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCancelPreview = () => {
    if (avatarPreview?.url) URL.revokeObjectURL(avatarPreview.url);
    setAvatarPreview(null);
  };

  // Change own password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) return toast.error('Password must be at least 4 characters');
    setPasswordSaving(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Save notification preferences
  const handleSavePrefs = async () => {
    setPrefsSaving(true);
    try {
      await api.patch('/users/me/notification-preferences', notifPrefs);
      useAuthStore.setState({ user: { ...user, notificationPrefs: notifPrefs } });
      toast.success('Preferences saved');
    } catch { toast.error('Failed to save preferences'); }
    finally { setPrefsSaving(false); }
  };

  // Export data
  const handleExportData = async () => {
    try {
      const res = await api.get('/users/me/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported!');
    } catch { toast.error('Failed to export data'); }
  };

  // Deactivate account
  const handleDeactivate = async () => {
    try {
      await api.put(`/users/${user.id || user._id}`, { isActive: false });
      toast.success('Account deactivated');
      useAuthStore.getState().logout();
    } catch { toast.error('Failed to deactivate'); }
  };

  // Member CRUD callbacks
  const handleMemberSave = (savedMember, action) => {
    if (action === 'create') {
      setMembers((prev) => [...prev, savedMember]);
    } else {
      setMembers((prev) => prev.map((m) => (m.id || m._id) === (savedMember.id || savedMember._id) ? savedMember : m));
    }
  };

  const handleMemberDelete = (id) => {
    setMembers((prev) => prev.filter((m) => (m.id || m._id) !== id));
  };

  const togglePref = (key) => setNotifPrefs((p) => ({ ...p, [key]: !p[key] }));

  const avatarSrc = avatarPreview?.url || user?.avatarUrl || user?.profilePicture;

  // Theme
  const [currentTheme, setCurrentTheme] = useState(getTheme());
  const handleThemeChange = (theme) => {
    applyTheme(theme);
    setCurrentTheme(theme);
  };

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-zinc-400">Manage your account and workspace</p>
        </div>

        {/* ── Profile Info ── */}
        <SettingsSection title="Profile Info">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative group">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white overflow-hidden border-2 border-transparent group-hover:border-blue-500 transition-all cursor-pointer"
                style={{ backgroundColor: user?.avatarColor || '#6366f1' }}
                onClick={() => document.getElementById('profile-upload').click()}
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt={user?.name} className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0)
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
              </div>
              <input type="file" id="profile-upload" className="hidden" accept="image/jpeg,image/png" onChange={handleAvatarSelect} disabled={profileSaving} />
            </div>
            <div>
              <h4 className="font-bold text-white">{user?.name}</h4>
              <p className="text-zinc-500">{user?.role}</p>
              {user?.email && <p className="text-xs text-zinc-500">{user?.email}</p>}
              {avatarPreview && (
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={handleAvatarUpload} disabled={profileSaving} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg disabled:opacity-50">{profileSaving ? 'Uploading...' : 'Upload'}</button>
                  <button onClick={handleCancelPreview} className="text-xs text-zinc-500 hover:text-zinc-300">Cancel</button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Display Name</label>
              <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)}
                className="w-full p-2 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-zinc-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Role</label>
              <input type="text" defaultValue={user?.role} disabled
                className="w-full p-2 bg-zinc-900 border-none rounded-lg text-zinc-500 cursor-not-allowed text-sm" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={handleSaveProfile} disabled={profileSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center">
              <Save size={16} className="mr-2" />
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </SettingsSection>

        {/* ── Appearance ── */}
        <SettingsSection title="Appearance" icon={Palette}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-200">Theme</p>
              <p className="text-[10px] text-zinc-500">Choose your preferred color scheme</p>
            </div>
            <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${currentTheme === 'dark' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <Moon size={13} /> Dark
              </button>
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${currentTheme === 'light' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <Sun size={13} /> Light
              </button>
            </div>
          </div>
        </SettingsSection>

        {/* ── Change Password ── */}
        <SettingsSection title="Change Password" icon={Key}>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Current Password</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Current password" />
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="New password (min 4 chars)" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={passwordSaving}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {passwordSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </SettingsSection>

        {/* ── Admin PIN (admin only) ── */}
        {isAdmin && (
          <SettingsSection title="Admin PIN" icon={Shield}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Lock size={20} className="text-zinc-500 mr-3" />
                <div>
                  <p className="font-medium text-zinc-200">Shared Admin PIN</p>
                  <p className="text-xs text-zinc-500">Used for admin-level access to the workspace</p>
                </div>
              </div>
              <button onClick={() => setShowPinModal(true)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Change PIN
              </button>
            </div>
          </SettingsSection>
        )}

        {/* ── Team Management (admin only) ── */}
        {isAdmin && (
          <SettingsSection title="Team Management" icon={Users}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-zinc-400">{members.filter(m => m.isActive !== false).length} active members</p>
              <button onClick={() => { setEditMember(null); setShowMemberForm(true); }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center">
                <UserPlus size={16} className="mr-2" /> Add Member
              </button>
            </div>

            {membersLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-zinc-900 rounded-lg"></div>)}
              </div>
            ) : (
              <div className="space-y-2">
                {members.filter(m => m.isActive !== false).map((m) => (
                  <div key={m.id || m._id} className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3"
                        style={{ backgroundColor: m.avatarColor || '#6366f1' }}>
                        {m.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{m.name}</p>
                        <p className="text-xs text-zinc-500">
                          {m.email || 'No email'} &middot; {m.role}
                          {m.isAdmin && <span className="ml-2 text-blue-400 font-medium">Admin</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => { setEditMember(m); setShowMemberForm(true); }}
                        className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 rounded-lg transition-colors" title="Edit">
                        <Pencil size={16} />
                      </button>
                      {(m.id || m._id) !== (user?.id || user?._id) && (
                        <button onClick={() => setDeleteMember(m)}
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors" title="Remove">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SettingsSection>
        )}

        {/* ── Notification Preferences ── */}
        <SettingsSection title="Notification Preferences" icon={Bell}>
          {[
            { key: 'inApp', label: 'In-app notifications', desc: 'Show notifications in the bell menu' },
            { key: 'taskAssigned', label: 'Task assigned to me', desc: 'When someone assigns a task to you' },
            { key: 'taskDone', label: 'Task moved to Done', desc: 'When a task you created is completed' },
            { key: 'commentAdded', label: 'Comment on my task', desc: 'When someone comments on your task' },
            { key: 'taskOverdue', label: 'Task overdue alerts', desc: 'When your tasks become overdue' },
            { key: 'mentioned', label: '@Mention notifications', desc: 'When someone mentions you in a comment' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-zinc-200">{item.label}</p>
                <p className="text-[10px] text-zinc-500">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={notifPrefs[item.key] ?? true} onChange={() => togglePref(item.key)} className="sr-only peer" />
                <div className="w-10 h-5 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <button onClick={handleSavePrefs} disabled={prefsSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center">
              <Save size={14} className="mr-1.5" /> {prefsSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </SettingsSection>

        {/* ── Danger Zone ── */}
        <SettingsSection title="Danger Zone" icon={AlertTriangle}>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div>
                <p className="text-sm font-medium text-zinc-200">Export My Data</p>
                <p className="text-[10px] text-zinc-500">Download all your tasks, comments, and subtasks as JSON</p>
              </div>
              <button onClick={handleExportData} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors">
                <Download size={14} /> Export
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-500/5 rounded-lg border border-red-500/20">
              <div>
                <p className="text-sm font-medium text-red-400">Deactivate Account</p>
                <p className="text-[10px] text-zinc-500">This will log you out and prevent future logins</p>
              </div>
              <button onClick={() => setShowDeactivateModal(true)} className="bg-red-600/10 hover:bg-red-600/20 text-red-400 px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-red-500/30">
                <LogOut size={14} /> Deactivate
              </button>
            </div>
          </div>
        </SettingsSection>

        {/* ── Deactivate Confirmation Modal ── */}
        {showDeactivateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeactivateModal(false)}>
            <div className="bg-[#111] rounded-2xl shadow-2xl w-full max-w-sm border border-red-500/30 p-6" onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-4">
                <AlertTriangle size={32} className="text-red-400 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-white">Deactivate Account</h3>
                <p className="text-sm text-zinc-400 mt-1">Type <code className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded text-xs">DEACTIVATE</code> to confirm</p>
              </div>
              <input
                type="text"
                value={deactivateConfirm}
                onChange={(e) => setDeactivateConfirm(e.target.value)}
                placeholder="Type DEACTIVATE"
                className="w-full p-2.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:ring-2 focus:ring-red-500 mb-4"
              />
              <div className="flex gap-2">
                <button onClick={() => { setShowDeactivateModal(false); setDeactivateConfirm(''); }} className="flex-1 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 rounded-lg">Cancel</button>
                <button
                  onClick={handleDeactivate}
                  disabled={deactivateConfirm !== 'DEACTIVATE'}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Deactivate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modals ── */}
        <AnimatePresence>
          {showPinModal && <ChangePinModal onClose={() => setShowPinModal(false)} />}
          {showMemberForm && (
            <MemberFormModal
              member={editMember}
              onClose={() => { setShowMemberForm(false); setEditMember(null); }}
              onSave={handleMemberSave}
            />
          )}
          {deleteMember && (
            <DeleteConfirmModal
              member={deleteMember}
              onClose={() => setDeleteMember(null)}
              onConfirm={handleMemberDelete}
            />
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default SettingsPage;
