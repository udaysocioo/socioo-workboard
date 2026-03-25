import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Check, Filter } from 'lucide-react';
import clsx from 'clsx';
import api from '../../services/api';

const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-green-500' },
];

// Generic multi-select dropdown
const MultiSelect = ({ label, options, selected, onChange, renderOption }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
          selected.length > 0
            ? 'bg-blue-600/15 border-blue-500/30 text-blue-300'
            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700',
        )}
      >
        {label}
        {selected.length > 0 && (
          <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">
            {selected.length}
          </span>
        )}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-xl w-56 max-h-60 overflow-y-auto py-1">
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(isSelected ? selected.filter((v) => v !== opt.value) : [...selected, opt.value]);
                }}
                className={clsx(
                  'w-full flex items-center px-3 py-2 text-xs hover:bg-zinc-800 transition-colors',
                  isSelected ? 'text-blue-400' : 'text-zinc-300',
                )}
              >
                <div className={clsx(
                  'w-3.5 h-3.5 rounded border mr-2 flex items-center justify-center flex-shrink-0',
                  isSelected ? 'bg-blue-600 border-blue-600' : 'border-zinc-600',
                )}>
                  {isSelected && <Check size={10} className="text-white" />}
                </div>
                {renderOption ? renderOption(opt) : opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const FilterBar = ({ filters, onChange }) => {
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    api.get('/projects').then((r) => {
      const data = r.data.data || r.data;
      setProjects(Array.isArray(data) ? data : []);
    }).catch(() => {});
    api.get('/users').then((r) => setMembers(r.data || [])).catch(() => {});
  }, []);

  const projectOptions = projects.map((p) => ({
    value: p.id || p._id,
    label: p.name,
    color: p.color,
  }));

  const memberOptions = members.map((m) => ({
    value: m.id || m._id,
    label: m.name,
    avatarColor: m.avatarColor,
  }));

  // Collect all labels from context (we'll just show what's selected)
  const activeChips = [];
  filters.projectIds?.forEach((id) => {
    const p = projectOptions.find((o) => o.value === id);
    if (p) activeChips.push({ key: `p-${id}`, label: p.label, color: p.color, type: 'projectIds', value: id });
  });
  filters.assigneeIds?.forEach((id) => {
    const m = memberOptions.find((o) => o.value === id);
    if (m) activeChips.push({ key: `a-${id}`, label: m.label, type: 'assigneeIds', value: id });
  });
  filters.priorities?.forEach((p) => {
    const pr = PRIORITY_OPTIONS.find((o) => o.value === p);
    if (pr) activeChips.push({ key: `pr-${p}`, label: pr.label, type: 'priorities', value: p });
  });
  if (filters.dueBefore) {
    activeChips.push({ key: 'due', label: `Due before ${filters.dueBefore}`, type: 'dueBefore', value: filters.dueBefore });
  }

  const hasFilters = activeChips.length > 0;

  const removeChip = (chip) => {
    if (chip.type === 'dueBefore') {
      onChange({ ...filters, dueBefore: '' });
    } else {
      onChange({ ...filters, [chip.type]: filters[chip.type].filter((v) => v !== chip.value) });
    }
  };

  const clearAll = () => {
    onChange({ projectIds: [], assigneeIds: [], priorities: [], dueBefore: '' });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-zinc-500 mr-1">
          <Filter size={13} /> Filters
        </div>

        <MultiSelect
          label="Project"
          options={projectOptions}
          selected={filters.projectIds || []}
          onChange={(val) => onChange({ ...filters, projectIds: val })}
          renderOption={(opt) => (
            <span className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: opt.color }} />
              {opt.label}
            </span>
          )}
        />

        <MultiSelect
          label="Assignee"
          options={memberOptions}
          selected={filters.assigneeIds || []}
          onChange={(val) => onChange({ ...filters, assigneeIds: val })}
          renderOption={(opt) => (
            <span className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
                style={{ backgroundColor: opt.avatarColor || '#6366f1' }}
              >
                {opt.label?.charAt(0)}
              </div>
              {opt.label}
            </span>
          )}
        />

        <MultiSelect
          label="Priority"
          options={PRIORITY_OPTIONS}
          selected={filters.priorities || []}
          onChange={(val) => onChange({ ...filters, priorities: val })}
          renderOption={(opt) => (
            <span className="flex items-center gap-2">
              <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', opt.color)} />
              {opt.label}
            </span>
          )}
        />

        {/* Due date */}
        <div className="relative">
          <input
            type="date"
            value={filters.dueBefore || ''}
            onChange={(e) => onChange({ ...filters, dueBefore: e.target.value })}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border outline-none',
              filters.dueBefore
                ? 'bg-blue-600/15 border-blue-500/30 text-blue-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400',
            )}
            title="Due before"
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors ml-1"
          >
            <X size={12} /> Clear All
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-xs text-zinc-300 border border-zinc-700"
            >
              {chip.color && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: chip.color }} />}
              {chip.label}
              <button onClick={() => removeChip(chip)} className="text-zinc-500 hover:text-zinc-300 ml-0.5">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(FilterBar);
