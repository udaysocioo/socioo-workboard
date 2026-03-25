import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Download, Filter, X, ChevronDown,
  CheckCircle2, PlusCircle, MessageSquare, ArrowRight,
  FolderOpen, User, Trash2, FileText, AlertCircle, Star,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
import api from '../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import PageTransition from '../components/common/PageTransition';
import Skeleton from '../components/common/Skeleton';

// ── action display config ──────────────────────────────────────
const ACTION_CONFIG = {
  task_created:     { dot: 'bg-blue-500',   icon: PlusCircle,   color: 'text-blue-400',   verb: 'created' },
  task_updated:     { dot: 'bg-yellow-500', icon: Star,         color: 'text-yellow-400', verb: 'updated' },
  task_moved:       { dot: 'bg-yellow-500', icon: ArrowRight,   color: 'text-yellow-400', verb: 'moved' },
  task_completed:   { dot: 'bg-green-500',  icon: CheckCircle2, color: 'text-green-400',  verb: 'completed' },
  task_deleted:     { dot: 'bg-red-500',    icon: Trash2,       color: 'text-red-400',    verb: 'deleted' },
  task_assigned:    { dot: 'bg-cyan-500',   icon: User,         color: 'text-cyan-400',   verb: 'assigned' },
  comment_added:    { dot: 'bg-purple-500', icon: MessageSquare, color: 'text-purple-400', verb: 'commented on' },
  attachment_added: { dot: 'bg-orange-500', icon: FileText,     color: 'text-orange-400', verb: 'uploaded to' },
  subtask_completed:{ dot: 'bg-green-400',  icon: CheckCircle2, color: 'text-green-300',  verb: 'completed subtask in' },
  project_created:  { dot: 'bg-blue-500',   icon: FolderOpen,   color: 'text-blue-400',   verb: 'created project' },
  project_updated:  { dot: 'bg-yellow-500', icon: FolderOpen,   color: 'text-yellow-400', verb: 'updated project' },
  project_archived: { dot: 'bg-zinc-500',   icon: FolderOpen,   color: 'text-zinc-400',   verb: 'archived project' },
};

const DEFAULT_CONFIG = { dot: 'bg-zinc-500', icon: AlertCircle, color: 'text-zinc-400', verb: '' };

const ACTION_TYPE_FILTERS = [
  { value: '', label: 'All Types' },
  { value: 'task', label: 'Tasks', types: ['task_created', 'task_updated', 'task_moved', 'task_completed', 'task_deleted', 'task_assigned'] },
  { value: 'project', label: 'Projects', types: ['project_created', 'project_updated', 'project_archived'] },
  { value: 'comment', label: 'Comments', types: ['comment_added'] },
  { value: 'file', label: 'Files', types: ['attachment_added'] },
];

// ── date grouping ──────────────────────────────────────────────
function getDateGroup(dateStr) {
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    if (isThisWeek(d, { weekStartsOn: 1 })) return 'This Week';
    return format(d, 'MMMM d, yyyy');
  } catch { return 'Unknown'; }
}

// ── ActivityItem ───────────────────────────────────────────────
const ActivityItem = React.memo(({ activity }) => {
  const config = ACTION_CONFIG[activity.action] || DEFAULT_CONFIG;
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-4 py-3.5 px-4 hover:bg-zinc-900/30 -mx-4 rounded-lg transition-colors group">
      {/* Dot + line */}
      <div className="flex flex-col items-center flex-shrink-0 pt-1">
        <div className={clsx('w-3 h-3 rounded-full ring-4 ring-black', config.dot)} />
      </div>

      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: activity.user?.avatarColor || '#3b82f6' }}
        title={activity.user?.name || ''}
      >
        {activity.user?.name?.charAt(0) || '?'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300 leading-relaxed">
          <span className="font-semibold text-white">{activity.user?.name || 'Unknown'}</span>{' '}
          <span className={config.color}>{config.verb || activity.action?.replace(/_/g, ' ')}</span>{' '}
          <span className="font-medium text-blue-400">{activity.details}</span>
        </p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-[11px] text-zinc-600" title={activity.createdAt ? format(new Date(activity.createdAt), 'PPpp') : ''}>
            {activity.createdAt ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true }) : 'Just now'}
          </p>
          <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium', config.color, config.dot.replace('bg-', 'bg-') + '/10')}>
            {activity.targetType}
          </span>
        </div>
      </div>

      {/* Icon */}
      <div className={clsx('p-1.5 rounded-lg opacity-60 group-hover:opacity-100 transition-opacity', config.color)}>
        <Icon size={14} />
      </div>
    </div>
  );
});

// ═════════════════════════════════════════════════════════════════
// ACTIVITY PAGE
// ═════════════════════════════════════════════════════════════════
const ActivityPage = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [filterProject, setFilterProject] = useState('');
  const [filterMember, setFilterMember] = useState('');
  const [filterActionType, setFilterActionType] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter options
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);

  // Fetch filter options
  useEffect(() => {
    api.get('/projects').then((r) => {
      const data = r.data.data || r.data;
      setProjects(Array.isArray(data) ? data : []);
    }).catch(() => {});
    api.get('/users').then((r) => setMembers(r.data || [])).catch(() => {});
  }, []);

  // Build query params
  const buildParams = useCallback((pageNum) => {
    const params = { page: pageNum, limit: 50 };
    if (filterProject) params.projectId = filterProject;
    if (filterMember) params.userId = filterMember;
    if (filterFrom) params.from = filterFrom;
    if (filterTo) params.to = filterTo;
    // For action type we filter client-side since backend filters by targetType
    if (filterActionType) {
      const typeFilter = ACTION_TYPE_FILTERS.find((f) => f.value === filterActionType);
      if (typeFilter?.value === 'task') params.targetType = 'task';
      else if (typeFilter?.value === 'project') params.targetType = 'project';
      else if (typeFilter?.value === 'comment') params.targetType = 'comment';
      else if (typeFilter?.value === 'file') params.targetType = 'task'; // attachments are logged on tasks
    }
    return params;
  }, [filterProject, filterMember, filterActionType, filterFrom, filterTo]);

  const fetchActivities = useCallback(async (pageNum = 1, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = buildParams(pageNum);
      const res = await api.get('/activities', { params });
      const data = res.data.activities || [];
      const pagination = res.data.pagination || {};

      // Client-side action type filtering if needed
      let filtered = data;
      if (filterActionType) {
        const typeObj = ACTION_TYPE_FILTERS.find((f) => f.value === filterActionType);
        if (typeObj?.types) {
          filtered = data.filter((a) => typeObj.types.includes(a.action));
        }
      }

      if (append) {
        setActivities((prev) => [...prev, ...filtered]);
      } else {
        setActivities(filtered);
      }
      setPage(pagination.page || pageNum);
      setTotalPages(pagination.pages || 1);
      setTotal(pagination.total || 0);
    } catch {
      toast.error('Failed to fetch activities');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildParams, filterActionType]);

  useEffect(() => {
    fetchActivities(1, false);
  }, [fetchActivities]);

  const handleLoadMore = () => {
    if (page < totalPages) {
      fetchActivities(page + 1, true);
    }
  };

  const handleReset = () => {
    setFilterProject('');
    setFilterMember('');
    setFilterActionType('');
    setFilterFrom('');
    setFilterTo('');
  };

  const hasActiveFilters = filterProject || filterMember || filterActionType || filterFrom || filterTo;

  // Export CSV
  const handleExport = async () => {
    try {
      const params = {};
      if (filterProject) params.projectId = filterProject;
      if (filterMember) params.userId = filterMember;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;

      const res = await api.get('/activities/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'activity-log.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported!');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups = [];
    let currentGroup = null;

    activities.forEach((activity) => {
      const group = getDateGroup(activity.createdAt);
      if (!currentGroup || currentGroup.label !== group) {
        currentGroup = { label: group, items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(activity);
    });

    return groups;
  }, [activities]);

  // Select styling helpers
  const selectClass = 'bg-[#0a0a0a] border border-zinc-800 rounded-lg text-sm text-zinc-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer';

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Activity Log</h1>
            <p className="text-zinc-500 text-sm">
              {total > 0 ? `${total} total actions` : 'Recent actions across the workspace'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors border',
                hasActiveFilters
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200',
              )}
            >
              <Filter size={15} />
              Filters
              {hasActiveFilters && (
                <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {[filterProject, filterMember, filterActionType, filterFrom, filterTo].filter(Boolean).length}
                </span>
              )}
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Download size={15} /> Export CSV
            </button>
            <button
              onClick={() => fetchActivities(1, false)}
              disabled={loading}
              className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-[#111] border border-zinc-800 rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* Project */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1 uppercase tracking-wider">Project</label>
                    <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className={selectClass + ' w-full'}>
                      <option value="">All Projects</option>
                      {projects.map((p) => (
                        <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Member */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1 uppercase tracking-wider">Member</label>
                    <select value={filterMember} onChange={(e) => setFilterMember(e.target.value)} className={selectClass + ' w-full'}>
                      <option value="">All Members</option>
                      {members.map((m) => (
                        <option key={m.id || m._id} value={m.id || m._id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Action Type */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1 uppercase tracking-wider">Action Type</label>
                    <select value={filterActionType} onChange={(e) => setFilterActionType(e.target.value)} className={selectClass + ' w-full'}>
                      {ACTION_TYPE_FILTERS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date From */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1 uppercase tracking-wider">From</label>
                    <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className={selectClass + ' w-full'} />
                  </div>

                  {/* Date To */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1 uppercase tracking-wider">To</label>
                    <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className={selectClass + ' w-full'} />
                  </div>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={handleReset}
                    className="mt-3 text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                  >
                    <X size={12} /> Reset Filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Activity Timeline */}
        {loading && activities.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton variant="circle" className="w-3 h-3" />
                <Skeleton variant="circle" className="w-8 h-8" />
                <div className="flex-1 space-y-1">
                  <Skeleton variant="text" className="w-3/4" />
                  <Skeleton variant="text" className="w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle size={40} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">No activities found</p>
            {hasActiveFilters && (
              <button onClick={handleReset} className="mt-2 text-sm text-blue-400 hover:text-blue-300">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {groupedActivities.map((group) => (
              <div key={group.label}>
                {/* Date group header */}
                <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm py-2 mb-1">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-zinc-800" />
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2">
                      {group.label}
                    </span>
                    <div className="h-px flex-1 bg-zinc-800" />
                  </div>
                </div>

                {/* Items */}
                <AnimatePresence mode="popLayout">
                  {group.items.map((activity, idx) => (
                    <motion.div
                      key={activity.id || `${group.label}-${idx}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                    >
                      <ActivityItem activity={activity} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ))}

            {/* Load More */}
            {page < totalPages && (
              <div className="pt-6 pb-4 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors border border-zinc-700 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw size={14} className="animate-spin" /> Loading...
                    </span>
                  ) : (
                    `Load 50 more (${activities.length} of ${total})`
                  )}
                </button>
              </div>
            )}

            {/* End indicator */}
            {page >= totalPages && activities.length > 0 && (
              <div className="pt-6 pb-4 text-center">
                <p className="text-xs text-zinc-600">All {total} activities loaded</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default ActivityPage;
