import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X, Calendar, User, AlignLeft, CheckSquare, Paperclip, MessageSquare,
  Send, Trash2, Plus, ChevronDown, Check, Clock, Tag, Activity,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import api from '../../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useTaskStore } from '../../store/taskStore';

const STATUS_OPTIONS = [
  { label: 'Todo', value: 'todo', color: 'bg-zinc-500' },
  { label: 'In Progress', value: 'in_progress', color: 'bg-blue-500' },
  { label: 'Review', value: 'review', color: 'bg-yellow-500' },
  { label: 'Done', value: 'done', color: 'bg-green-500' },
];

const LABEL_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

const TaskDetailDrawer = ({ task: initialTask, onClose }) => {
  const [task, setTask] = useState(initialTask);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [members, setMembers] = useState([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const { fetchTasks, deleteTask } = useTaskStore();

  const taskId = task?._id || task?.id;

  // Fetch details
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const id = initialTask.id || initialTask._id;
        const [taskRes, commentsRes] = await Promise.all([
          api.get(`/tasks/${id}`),
          api.get(`/tasks/${id}/comments`),
        ]);
        setTask(taskRes.data);
        setComments(commentsRes.data);
        setTitleDraft(taskRes.data.title);

        // Fetch activity for this task
        const actRes = await api.get('/activities', { params: { targetType: 'task', limit: 15 } });
        const taskActivities = (actRes.data.activities || []).filter(
          (a) => a.targetId === id || a.metadata?.taskId === id
        );
        setActivities(taskActivities);
      } catch (error) {
        console.error('Failed to fetch task details', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
    api.get('/users').then((r) => setMembers(r.data || [])).catch(() => {});
  }, [initialTask]);

  // Escape to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const refreshTask = useCallback(async () => {
    try {
      const res = await api.get(`/tasks/${taskId}`);
      setTask(res.data);
    } catch {}
  }, [taskId]);

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/tasks/${taskId}/comments`, { text: newComment });
      setComments([...comments, res.data]);
      setNewComment('');
      toast.success('Comment added');
    } catch { toast.error('Failed to post comment'); }
    finally { setActionLoading(false); }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, { status: newStatus });
      setTask(res.data);
      fetchTasks();
      toast.success(`Moved to ${STATUS_OPTIONS.find((s) => s.value === newStatus)?.label}`);
    } catch { toast.error('Failed to update status'); }
  };

  const handleTitleSave = async () => {
    if (!titleDraft.trim() || titleDraft === task.title) { setEditingTitle(false); return; }
    try {
      const res = await api.put(`/tasks/${taskId}`, { title: titleDraft.trim() });
      setTask(res.data);
      fetchTasks();
      setEditingTitle(false);
    } catch { toast.error('Failed to update title'); }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/tasks/${taskId}/subtasks`, { title: newSubtask });
      setTask(res.data);
      setNewSubtask('');
      setShowSubtaskInput(false);
      toast.success('Subtask added');
    } catch { toast.error('Failed to add subtask'); }
    finally { setActionLoading(false); }
  };

  const handleToggleSubtask = async (subtask) => {
    try {
      const sid = subtask.id || subtask._id;
      const res = await api.put(`/tasks/${taskId}/subtasks/${sid}`);
      setTask(res.data);
    } catch { toast.error('Failed to update subtask'); }
  };

  const handleDeleteSubtask = async (subtask) => {
    try {
      const sid = subtask.id || subtask._id;
      const res = await api.delete(`/tasks/${taskId}/subtasks/${sid}`);
      setTask(res.data);
    } catch { toast.error('Failed to delete subtask'); }
  };

  const handleDeleteTask = async () => {
    setActionLoading(true);
    try {
      await deleteTask(taskId);
      toast.success('Task deleted');
      onClose();
    } catch { toast.error('Failed to delete task'); setActionLoading(false); }
  };

  const handleAssigneeToggle = async (memberId) => {
    const currentIds = (task.assignees || []).map((a) => a.id || a._id);
    const newIds = currentIds.includes(memberId)
      ? currentIds.filter((id) => id !== memberId)
      : [...currentIds, memberId];
    try {
      const res = await api.put(`/tasks/${taskId}`, { assigneeIds: newIds });
      setTask(res.data);
      fetchTasks();
    } catch { toast.error('Failed to update assignees'); }
  };

  const handleDateChange = async (e) => {
    const newDate = e.target.value;
    try {
      const res = await api.put(`/tasks/${taskId}`, { deadline: newDate ? new Date(newDate).toISOString() : null });
      setTask(res.data);
      fetchTasks();
    } catch { toast.error('Failed to update date'); }
  };

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/tasks/${taskId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTask(res.data);
      toast.success('Attachment added');
    } catch { toast.error('Failed to upload'); }
    finally { setActionLoading(false); }
  };

  if (!task) return null;

  const subtaskTotal = Array.isArray(task.subtasks) ? task.subtasks.length : 0;
  const subtaskDone = Array.isArray(task.subtasks) ? task.subtasks.filter((s) => s.completed).length : 0;
  const subtaskPct = subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0;

  const currentStatus = task.status;
  const statusOrder = ['todo', 'in_progress', 'review', 'done'];
  const currentIdx = statusOrder.indexOf(currentStatus);
  const nextStatus = currentIdx < statusOrder.length - 1 ? statusOrder[currentIdx + 1] : null;
  const nextStatusLabel = nextStatus ? STATUS_OPTIONS.find((s) => s.value === nextStatus)?.label : null;

  const currentAssigneeIds = (task.assignees || []).map((a) => a.id || a._id);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111] w-full max-w-2xl h-full overflow-y-auto border-l border-zinc-800 shadow-2xl"
      >
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading details...</div>
        ) : (
          <>
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex justify-between items-start sticky top-0 bg-[#111] z-10">
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    {task.project?.name || 'General'}
                  </span>
                  <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded',
                    task.priority === 'critical' ? 'bg-red-500/10 text-red-400'
                      : task.priority === 'high' ? 'bg-orange-500/10 text-orange-400'
                      : task.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400'
                      : 'bg-green-500/10 text-green-400'
                  )}>
                    {task.priority}
                  </span>
                  <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded',
                    currentStatus === 'done' ? 'bg-green-500/10 text-green-400'
                      : currentStatus === 'in_progress' ? 'bg-blue-500/10 text-blue-400'
                      : currentStatus === 'review' ? 'bg-yellow-500/10 text-yellow-400'
                      : 'bg-zinc-800 text-zinc-400'
                  )}>
                    {STATUS_OPTIONS.find((s) => s.value === currentStatus)?.label || currentStatus}
                  </span>
                </div>
                {editingTitle ? (
                  <input
                    type="text"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(task.title); } }}
                    className="text-xl font-bold text-white bg-transparent border-b border-blue-500 outline-none w-full py-1"
                    autoFocus
                  />
                ) : (
                  <h2
                    className="text-xl font-bold text-white cursor-text hover:text-blue-400 transition-colors"
                    onClick={() => { setEditingTitle(true); setTitleDraft(task.title); }}
                  >
                    {task.title}
                  </h2>
                )}
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-800 flex-shrink-0">
                <X size={22} />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Left (2 cols) */}
              <div className="md:col-span-2 space-y-5">
                {/* Labels */}
                {task.labels && task.labels.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-zinc-500 flex items-center mb-2"><Tag size={13} className="mr-1.5" /> Labels</h3>
                    <div className="flex flex-wrap gap-1">
                      {task.labels.map((l, i) => (
                        <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: LABEL_COLORS[i % LABEL_COLORS.length] + '20', color: LABEL_COLORS[i % LABEL_COLORS.length] }}>
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <h3 className="text-xs font-bold text-zinc-500 flex items-center mb-2"><AlignLeft size={13} className="mr-1.5" /> Description</h3>
                  <div className="text-zinc-300 text-sm leading-relaxed p-3 bg-zinc-900/50 rounded-lg min-h-[60px]">
                    <p>{task.description || 'No description provided.'}</p>
                  </div>
                </div>

                {/* Subtasks */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-zinc-500 flex items-center"><CheckSquare size={13} className="mr-1.5" /> Subtasks</h3>
                    {subtaskTotal > 0 && <span className="text-[10px] text-zinc-500">{subtaskDone}/{subtaskTotal} ({subtaskPct}%)</span>}
                  </div>
                  {subtaskTotal > 0 && (
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${subtaskPct}%` }} />
                    </div>
                  )}
                  <div className="space-y-1">
                    {Array.isArray(task.subtasks) && task.subtasks.map((sub) => (
                      <div key={sub.id || sub._id} className="flex items-center p-1.5 hover:bg-zinc-900 rounded-lg group">
                        <input type="checkbox" checked={sub.completed} onChange={() => handleToggleSubtask(sub)} className="rounded border-zinc-700 text-blue-600 focus:ring-blue-500 mr-2.5 w-3.5 h-3.5 cursor-pointer bg-zinc-900" />
                        <span className={clsx('text-sm flex-1', sub.completed ? 'text-zinc-500 line-through' : 'text-zinc-200')}>{sub.title}</span>
                        <button onClick={() => handleDeleteSubtask(sub)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-0.5"><Trash2 size={12} /></button>
                      </div>
                    ))}
                    {subtaskTotal === 0 && !showSubtaskInput && <p className="text-xs text-zinc-600 italic">No subtasks yet.</p>}
                    {showSubtaskInput ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input type="text" value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()} placeholder="Subtask title" className="flex-1 p-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-blue-500 outline-none" autoFocus />
                        <button onClick={handleAddSubtask} disabled={actionLoading} className="text-xs bg-blue-600 text-white px-2 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50">Add</button>
                        <button onClick={() => { setShowSubtaskInput(false); setNewSubtask(''); }} className="text-xs text-zinc-500 px-2 py-1.5">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setShowSubtaskInput(true)} className="text-xs text-blue-400 hover:text-blue-300 font-medium mt-1 flex items-center gap-1"><Plus size={12} /> Add subtask</button>
                    )}
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <h3 className="text-xs font-bold text-zinc-500 flex items-center mb-2"><MessageSquare size={13} className="mr-1.5" /> Comments</h3>
                  <div className="space-y-3 mb-3 max-h-60 overflow-y-auto">
                    {comments.length === 0 && <p className="text-xs text-zinc-600 italic">No comments yet.</p>}
                    {comments.map((comment, idx) => (
                      <div key={comment._id || comment.id || idx} className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: comment.user?.avatarColor || '#a855f7' }}>{comment.user?.name?.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="bg-zinc-900/50 rounded-lg rounded-tl-none p-2.5">
                            <p className="font-semibold mb-0.5 text-white text-[11px]">
                              {comment.user?.name}
                              <span className="text-zinc-500 font-normal ml-2 text-[10px]">{comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : ''}</span>
                            </p>
                            <p className="text-sm text-zinc-300">{comment.text}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePostComment()} placeholder="Write a comment..." className="w-full pl-3 pr-10 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-blue-500 outline-none" />
                      <button onClick={handlePostComment} disabled={actionLoading} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-300 disabled:opacity-50"><Send size={15} /></button>
                    </div>
                  </div>
                </div>

                {/* Activity Timeline */}
                {activities.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-zinc-500 flex items-center mb-2"><Activity size={13} className="mr-1.5" /> Activity</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {activities.map((a) => (
                        <div key={a.id} className="flex items-start gap-2 text-[11px]">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: a.user?.avatarColor || '#3b82f6' }}>{a.user?.name?.charAt(0)}</div>
                          <div className="flex-1 min-w-0">
                            <span className="text-zinc-400"><span className="text-zinc-200 font-medium">{a.user?.name}</span> {a.details}</span>
                            <p className="text-zinc-600 text-[10px]">{a.createdAt ? formatDistanceToNow(new Date(a.createdAt), { addSuffix: true }) : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right sidebar */}
              <div className="space-y-5">
                {/* Assignees */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Assignees</label>
                  {task.assignees && task.assignees.length > 0 && (
                    <div className="space-y-1 mb-1">
                      {task.assignees.map((a) => (
                        <div key={a.id || a._id} className="flex items-center p-1.5 hover:bg-zinc-900 rounded-lg">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold mr-2 text-white text-[10px]" style={{ backgroundColor: a.avatarColor || '#3b82f6' }}>{a.name?.charAt(0) || '?'}</div>
                          <span className="text-xs text-zinc-200 flex-1">{a.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <button onClick={() => setShowAssigneePicker(!showAssigneePicker)} className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus size={11} /> Add member</button>
                    {showAssigneePicker && (
                      <div className="absolute top-full mt-1 left-0 z-50 bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-xl w-52 max-h-48 overflow-y-auto py-1">
                        {members.map((m) => {
                          const mid = m.id || m._id;
                          const selected = currentAssigneeIds.includes(mid);
                          return (
                            <button key={mid} onClick={() => handleAssigneeToggle(mid)} className={clsx('w-full flex items-center px-3 py-1.5 text-xs hover:bg-zinc-800', selected ? 'text-blue-400' : 'text-zinc-300')}>
                              <div className={clsx('w-3 h-3 rounded border mr-2 flex items-center justify-center', selected ? 'bg-blue-600 border-blue-600' : 'border-zinc-600')}>{selected && <Check size={8} className="text-white" />}</div>
                              <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold mr-2" style={{ backgroundColor: m.avatarColor || '#6366f1' }}>{m.name?.charAt(0)}</div>
                              {m.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Due Date</label>
                  <input
                    type="date"
                    value={task.deadline ? format(new Date(task.deadline), 'yyyy-MM-dd') : ''}
                    onChange={handleDateChange}
                    className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Status</label>
                  <div className="space-y-0.5">
                    {STATUS_OPTIONS.map((s) => (
                      <button key={s.value} onClick={() => handleStatusChange(s.value)} className={clsx('w-full flex items-center px-2.5 py-1.5 rounded-lg text-xs transition-colors', task.status === s.value ? 'bg-blue-600 text-white font-medium' : 'text-zinc-300 hover:bg-zinc-900')}>
                        <span className={clsx('w-2 h-2 rounded-full mr-2', s.color)} />{s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Attachments */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Attachments</label>
                  {task.attachments && task.attachments.length > 0 ? (
                    task.attachments.map((att, i) => (
                      <div key={i} className="flex items-center p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-300 text-xs">
                        <Paperclip size={12} className="mr-2 flex-shrink-0" />
                        <span className="truncate flex-1">{att.originalname || att.name || `File ${i + 1}`}</span>
                        {att.size && <span className="text-zinc-600 text-[10px] ml-2">{(att.size / 1024).toFixed(0)}KB</span>}
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-zinc-600">No attachments</p>
                  )}
                  <label className="text-[11px] text-blue-400 hover:text-blue-300 mt-1 cursor-pointer inline-flex items-center gap-1">
                    <Plus size={11} /> Add file
                    <input type="file" className="hidden" onChange={handleAttachmentUpload} />
                  </label>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-zinc-800 space-y-2">
                  {nextStatus && (
                    <button onClick={() => handleStatusChange(nextStatus)} className="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 font-medium py-2 rounded-lg text-xs">
                      Move to {nextStatusLabel}
                    </button>
                  )}
                  <button onClick={() => setShowDeleteConfirm(true)} className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-400 font-medium py-2 rounded-lg text-xs flex items-center justify-center">
                    <Trash2 size={12} className="mr-1" /> Delete Task
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Delete confirm */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]" onClick={() => setShowDeleteConfirm(false)}>
            <div className="bg-[#111] rounded-xl p-6 border border-zinc-800 shadow-lg max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-2">Delete Task</h3>
              <p className="text-sm text-zinc-400 mb-4">Are you sure you want to delete "{task.title}"?</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 rounded-lg">Cancel</button>
                <button onClick={handleDeleteTask} disabled={actionLoading} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50">{actionLoading ? 'Deleting...' : 'Delete'}</button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default TaskDetailDrawer;
