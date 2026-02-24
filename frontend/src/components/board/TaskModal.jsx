import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Calendar,
  User,
  AlignLeft,
  CheckSquare,
  Paperclip,
  MessageSquare,
  Send,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useTaskStore } from '../../store/taskStore';

const STATUS_OPTIONS = [
  { label: 'Todo', value: 'todo', color: 'bg-zinc-500' },
  { label: 'In Progress', value: 'in_progress', color: 'bg-blue-500' },
  { label: 'Review', value: 'review', color: 'bg-yellow-500' },
  { label: 'Done', value: 'done', color: 'bg-green-500' },
];

const TaskModal = ({ task: initialTask, onClose }) => {
  const [task, setTask] = useState(initialTask);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { fetchTasks, deleteTask } = useTaskStore();

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const taskId = initialTask.id || initialTask._id;
        const res = await api.get(`/tasks/${taskId}`);
        setTask(res.data);
        const commentsRes = await api.get(`/tasks/${taskId}/comments`);
        setComments(commentsRes.data);
      } catch (error) {
        console.error('Failed to fetch task details', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [initialTask]);

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setActionLoading(true);
    try {
      const taskId = task._id || task.id;
      const res = await api.post(`/tasks/${taskId}/comments`, { text: newComment });
      setComments([...comments, res.data]);
      setNewComment('');
      toast.success('Comment added');
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const taskId = task._id || task.id;
      const res = await api.put(`/tasks/${taskId}`, { status: newStatus });
      setTask(res.data);
      fetchTasks();
      toast.success(`Moved to ${STATUS_OPTIONS.find((s) => s.value === newStatus)?.label}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    setActionLoading(true);
    try {
      const taskId = task._id || task.id;
      const res = await api.post(`/tasks/${taskId}/subtasks`, { title: newSubtask });
      setTask(res.data);
      setNewSubtask('');
      setShowSubtaskInput(false);
      toast.success('Subtask added');
    } catch {
      toast.error('Failed to add subtask');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSubtask = async (subtask) => {
    try {
      const taskId = task._id || task.id;
      const subtaskId = subtask.id || subtask._id;
      const res = await api.put(`/tasks/${taskId}/subtasks/${subtaskId}`);
      setTask(res.data);
    } catch {
      toast.error('Failed to update subtask');
    }
  };

  const handleDeleteTask = async () => {
    setActionLoading(true);
    try {
      const taskId = task._id || task.id;
      await deleteTask(taskId);
      toast.success('Task deleted');
      onClose();
    } catch {
      toast.error('Failed to delete task');
      setActionLoading(false);
    }
  };

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const taskId = task._id || task.id;
      const updatedAttachments = [...(task.attachments || []), { name: file.name, url: uploadRes.data.url }];
      const res = await api.put(`/tasks/${taskId}`, { attachments: updatedAttachments });
      setTask(res.data);
      toast.success('Attachment added');
    } catch {
      toast.error('Failed to upload attachment');
    } finally {
      setActionLoading(false);
    }
  };

  if (!task) return null;

  const currentStatus = task.status;
  const statusOrder = ['todo', 'in_progress', 'review', 'done'];
  const currentIdx = statusOrder.indexOf(currentStatus);
  const nextStatus = currentIdx < statusOrder.length - 1 ? statusOrder[currentIdx + 1] : null;
  const nextStatusLabel = nextStatus ? STATUS_OPTIONS.find((s) => s.value === nextStatus)?.label : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-zinc-800"
      >
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Loading details...</div>
          ) : (
            <>
              {/* Header */}
              <div className="p-6 border-b border-zinc-800 flex justify-between items-start sticky top-0 bg-[#111] z-10">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Project / {task.project?.name || 'General'}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      task.priority === 'critical' ? 'bg-red-500/10 text-red-400'
                        : task.priority === 'high' ? 'bg-orange-500/10 text-orange-400'
                        : task.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-green-500/10 text-green-400'
                    }`}>
                      {task.priority}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      task.status === 'done' ? 'bg-green-500/10 text-green-400'
                        : task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400'
                        : task.status === 'review' ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {STATUS_OPTIONS.find((s) => s.value === task.status)?.label || task.status}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">{task.title}</h2>
                </div>
                <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-full hover:bg-zinc-800">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="md:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center mb-2">
                      <AlignLeft size={16} className="mr-2 text-zinc-500" /> Description
                    </h3>
                    <div className="text-zinc-300 text-sm leading-relaxed p-3 bg-zinc-900 rounded-lg">
                      <p>{task.description || 'No description provided.'}</p>
                    </div>
                  </div>

                  {/* Subtasks */}
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center mb-2">
                      <CheckSquare size={16} className="mr-2 text-zinc-500" /> Subtasks
                    </h3>
                    <div className="space-y-2">
                      {Array.isArray(task.subtasks) && task.subtasks.length > 0 ? (
                        task.subtasks.map((sub) => (
                          <div key={sub.id || sub._id} className="flex items-center p-2 hover:bg-zinc-900 rounded-lg group">
                            <input
                              type="checkbox"
                              checked={sub.completed}
                              onChange={() => handleToggleSubtask(sub)}
                              className="rounded border-zinc-700 text-blue-600 focus:ring-blue-500 mr-3 w-4 h-4 cursor-pointer bg-zinc-900"
                            />
                            <span className={`text-sm flex-1 ${sub.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                              {sub.title}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-500 italic">No subtasks yet.</p>
                      )}
                      {showSubtaskInput ? (
                        <div className="flex items-center space-x-2 ml-7">
                          <input
                            type="text"
                            value={newSubtask}
                            onChange={(e) => setNewSubtask(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                            placeholder="Subtask title"
                            className="flex-1 p-1.5 bg-zinc-900 border border-zinc-800 rounded text-sm text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-blue-500 outline-none"
                            autoFocus
                          />
                          <button onClick={handleAddSubtask} disabled={actionLoading} className="text-xs bg-blue-600 text-white px-2 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50">Add</button>
                          <button onClick={() => { setShowSubtaskInput(false); setNewSubtask(''); }} className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1.5">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setShowSubtaskInput(true)} className="text-sm text-blue-400 hover:text-blue-300 font-medium ml-9 mt-1">
                          + Add subtask
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comments */}
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center mb-2">
                      <MessageSquare size={16} className="mr-2 text-zinc-500" /> Comments
                    </h3>
                    <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
                      {comments.map((comment, idx) => (
                        <div key={comment._id || idx} className="flex space-x-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: comment.user?.avatarColor || '#a855f7' }}
                          >
                            {comment.user?.name?.charAt(0)}
                          </div>
                          <div>
                            <div className="bg-zinc-900 rounded-lg rounded-tl-none p-3 text-sm text-zinc-200">
                              <p className="font-semibold mb-1 text-white text-xs">
                                {comment.user?.name}
                                <span className="text-zinc-500 font-normal ml-2">
                                  {comment.createdAt ? format(new Date(comment.createdAt), 'MMM d, h:mm a') : ''}
                                </span>
                              </p>
                              {comment.text}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0"></div>
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                          placeholder="Write a comment..."
                          className="w-full pl-4 pr-10 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button onClick={handlePostComment} disabled={actionLoading} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-300 disabled:opacity-50">
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column (Sidebar) */}
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Assignees</label>
                    {task.assignees && task.assignees.length > 0 ? (
                      <div className="space-y-1">
                        {task.assignees.map((a) => (
                          <div key={a.id || a._id} className="flex items-center p-2 hover:bg-zinc-900 rounded-lg transition-colors">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 text-white text-xs"
                              style={{ backgroundColor: a.avatarColor || '#3b82f6' }}
                            >
                              {a.name?.charAt(0) || '?'}
                            </div>
                            <span className="text-sm font-medium text-zinc-200">{a.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center p-2 text-zinc-500">
                        <User size={18} className="mr-3" />
                        <span className="text-sm">Unassigned</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Due Date</label>
                    <div className="flex items-center p-2 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors">
                      <Calendar size={18} className="text-zinc-500 mr-3" />
                      <span className="text-sm font-medium text-zinc-200">
                        {task.deadline ? format(new Date(task.deadline), 'MMM d, yyyy') : 'No Date'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Status</label>
                    <div className="space-y-1">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => handleStatusChange(s.value)}
                          className={`w-full flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            task.status === s.value
                              ? 'bg-blue-600 text-white font-medium'
                              : 'text-zinc-300 hover:bg-zinc-900'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full mr-2 ${s.color}`}></span>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Attachments</label>
                    {task.attachments && task.attachments.length > 0 ? (
                      task.attachments.map((att, i) => (
                        <div key={i} className="flex items-center p-2 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors text-zinc-300">
                          <Paperclip size={16} className="mr-2" />
                          <span className="text-sm">{att.name || `Attachment ${i + 1}`}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-zinc-500 p-2">No attachments</p>
                    )}
                    <label className="text-xs text-blue-400 hover:underline mt-2 ml-1 cursor-pointer inline-block">
                      + Add attachment
                      <input type="file" className="hidden" onChange={handleAttachmentUpload} />
                    </label>
                  </div>

                  <div className="pt-6 border-t border-zinc-800">
                    {nextStatus && (
                      <button
                        onClick={() => handleStatusChange(nextStatus)}
                        className="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 font-medium py-2 rounded-lg transition-colors text-sm mb-2"
                      >
                        Move to {nextStatusLabel}
                      </button>
                    )}
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-400 font-medium py-2 rounded-lg transition-colors text-sm flex items-center justify-center"
                    >
                      <Trash2 size={14} className="mr-1.5" /> Delete Task
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {showDeleteConfirm && (
            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center z-20">
              <div className="bg-[#111] rounded-xl p-6 m-6 border border-zinc-800 shadow-lg max-w-sm">
                <h3 className="text-lg font-bold text-white mb-2">Delete Task</h3>
                <p className="text-sm text-zinc-400 mb-4">Are you sure you want to delete "{task.title}"? This cannot be undone.</p>
                <div className="flex justify-end space-x-3">
                  <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 rounded-lg">Cancel</button>
                  <button onClick={handleDeleteTask} disabled={actionLoading} className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50">
                    {actionLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
      </motion.div>
    </motion.div>
  );
};

export default TaskModal;
