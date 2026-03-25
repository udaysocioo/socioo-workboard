import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Calendar } from 'lucide-react';

const ProjectProgress = ({ projects = [] }) => {
  if (!projects.length) return null;

  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-4">Project Progress</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-[#111] rounded-2xl border border-zinc-900 p-5 flex gap-4 items-center overflow-hidden relative"
          >
            {/* Color band */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
              style={{ backgroundColor: project.color }}
            />

            {/* Circular progress */}
            <div className="w-14 h-14 flex-shrink-0 ml-2">
              <CircularProgressbar
                value={project.progressPercent}
                text={`${project.progressPercent}%`}
                styles={buildStyles({
                  textSize: '26px',
                  textColor: '#fff',
                  pathColor: project.color,
                  trailColor: '#27272a',
                  pathTransitionDuration: 0.8,
                })}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{project.name}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs text-zinc-400">
                  {project.completedTasks}/{project.totalTasks} tasks
                </span>
                {project.daysUntilDeadline !== null && (
                  <span className={`text-xs flex items-center gap-1 ${
                    project.daysUntilDeadline < 0 ? 'text-red-400' :
                    project.daysUntilDeadline <= 3 ? 'text-orange-400' : 'text-zinc-500'
                  }`}>
                    <Calendar size={10} />
                    {project.daysUntilDeadline < 0
                      ? `${Math.abs(project.daysUntilDeadline)}d overdue`
                      : `${project.daysUntilDeadline}d left`}
                  </span>
                )}
              </div>
              {/* Member avatars */}
              <div className="flex -space-x-1.5 mt-2">
                {(project.members || []).slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold ring-1 ring-black"
                    style={{ backgroundColor: m.avatarColor || '#6366f1' }}
                    title={m.name}
                  >
                    {m.name?.charAt(0)}
                  </div>
                ))}
                {(project.members?.length || 0) > 5 && (
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-[8px] font-bold ring-1 ring-black">
                    +{project.members.length - 5}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectProgress;
