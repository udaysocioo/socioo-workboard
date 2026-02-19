import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import {
  Lock, Bell, Monitor, Users, Plus, Pencil, Trash2, X, Eye, EyeOff,
  UserPlus, Key, Save, Shield, Camera
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import PageTransition from '../components/common/PageTransition';

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
        const res = await api.put(`/users/${member._id}`, payload);
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
      await api.delete(`/users/${member._id}`);
      toast.success(`${member.name} has been deactivated`);
      onConfirm(member._id);
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

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Team management
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);

  // Modals
  const [showPinModal, setShowPinModal] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [deleteMember, setDeleteMember] = useState(null);

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
      const res = await api.put(`/users/${user._id}`, { name: profileName });
      useAuthStore.setState({ user: { ...user, name: res.data.name } });
      toast.success('Profile updated');
    } catch (err) {
      // api interceptor handles most errors
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      return toast.error('Image size must be less than 2MB');
    }

    setProfileSaving(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. Upload File
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const profilePicture = uploadRes.data.url;

      // 2. Update User Profile
      const updateRes = await api.put(`/users/${user._id}`, { profilePicture });
      
      // 3. Update Local State
      useAuthStore.setState({ user: { ...user, profilePicture: updateRes.data.profilePicture } });
      toast.success('Profile picture updated');
    } catch (err) {
      console.error('Upload failed', err);
      // Toast handled by interceptor
    } finally {
      setProfileSaving(false);
    }
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

  // Member CRUD callbacks
  const handleMemberSave = (savedMember, action) => {
    if (action === 'create') {
      setMembers((prev) => [...prev, savedMember]);
    } else {
      setMembers((prev) => prev.map((m) => m._id === savedMember._id ? savedMember : m));
    }
  };

  const handleMemberDelete = (id) => {
    setMembers((prev) => prev.filter((m) => m._id !== id));
  };



// ... (component)

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
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0)
                )}
                
                {/* Overlay for upload */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
              </div>
              <input 
                type="file" 
                id="profile-upload" 
                className="hidden" 
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={profileSaving}
              />
            </div>
            <div>
              <h4 className="font-bold text-white">{user?.name}</h4>
              <p className="text-zinc-500">{user?.role}</p>
              {user?.email && <p className="text-xs text-zinc-500">{user?.email}</p>}
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
                  <div key={m._id} className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
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
                      {m._id !== user?._id && (
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

        {/* ── Appearance ── */}
        <SettingsSection title="Appearance" icon={Monitor}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-200">Theme</p>
              <p className="text-xs text-zinc-500">Premium dark theme active</p>
            </div>
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <button className="p-2 rounded-md flex items-center bg-zinc-800 text-white text-sm font-medium">
                Dark
              </button>
            </div>
          </div>
        </SettingsSection>

        {/* ── Notifications ── */}
        <SettingsSection title="Notifications" icon={Bell}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-200">Email Notifications</p>
              <p className="text-xs text-zinc-500">Receive daily digest</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </SettingsSection>

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
