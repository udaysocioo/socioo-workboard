import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';

const BoardColumn = React.memo(({ id, title, tasks, onTaskClick }) => {
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] rounded-xl min-w-[300px] w-[300px] border border-zinc-800">
      <div className="p-4 flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <h3 className="font-bold text-zinc-200">{title}</h3>
          <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full text-xs font-bold">
            {tasks.length}
          </span>
        </div>
      </div>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-3 overflow-y-auto min-h-[100px] transition-colors ${
              snapshot.isDraggingOver ? 'bg-zinc-900/50' : ''
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onClick={onTaskClick}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
});

export default BoardColumn;
