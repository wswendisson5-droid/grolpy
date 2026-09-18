import React, { useState } from 'react';
import { CRMContact, CRMTask, TaskPriority } from '../../../types/crm';
import { TEAM_MEMBERS, CURRENT_AGENT } from '../../../data/crmMockData';
import {
  HugeIcon,
  PlusIcon,
  CheckIcon,
  Clock01Icon,
} from '../../icons/HugeIcon';

interface TasksTabProps {
  contact: CRMContact;
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Omit<CRMTask, 'id' | 'contactId' | 'timestamp'>) => void;
}

export const TasksTab: React.FC<TasksTabProps> = ({
  contact,
  onToggleTask,
  onAddTask,
}) => {
  const [filter, setFilter] = useState<'todas' | 'pendentes' | 'concluidas'>('todas');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('Hoje às 17:00');
  const [newPriority, setNewPriority] = useState<TaskPriority>('Média');
  const [newAssigneeId, setNewAssigneeId] = useState(CURRENT_AGENT.id);

  const pendingTasks = contact.tasks.filter((t) => !t.completed);
  const completedTasks = contact.tasks.filter((t) => t.completed);

  const displayedTasks = contact.tasks.filter((t) => {
    if (filter === 'pendentes') return !t.completed;
    if (filter === 'concluidas') return t.completed;
    return true;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const assignee =
      TEAM_MEMBERS.find((m) => m.id === newAssigneeId) || CURRENT_AGENT;

    onAddTask({
      title: newTitle.trim(),
      dueDate: newDueDate,
      assignedTo: assignee,
      priority: newPriority,
      completed: false,
    });

    setNewTitle('');
    setIsCreatingTask(false);
  };

  const getPriorityStyle = (priority: TaskPriority) => {
    switch (priority) {
      case 'Alta':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Média':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Baixa':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-xs text-[#1e3429]">
      {/* 1. Full-width Button "+ Nova tarefa" */}
      <button
        type="button"
        onClick={() => setIsCreatingTask((prev) => !prev)}
        className="w-full py-2.5 px-4 bg-[#12382c] hover:bg-[#1a4b3b] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
      >
        <HugeIcon icon={PlusIcon} size={16} />
        <span>Nova tarefa</span>
      </button>

      {/* Inline Task Creator Form */}
      {isCreatingTask && (
        <form
          onSubmit={handleCreate}
          className="p-3.5 bg-[#f5faf7] border border-[#cfe3d6] rounded-2xl flex flex-col gap-3 animate-in fade-in duration-150"
        >
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#142d22]">
              Título da tarefa
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Enviar proposta comercial..."
              className="px-3 py-1.5 bg-white border border-[#d8e7de] rounded-xl text-xs text-[#142d22] outline-hidden focus:border-[#12382c]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#142d22]">Data/Hora</label>
              <input
                type="text"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                placeholder="Ex: Amanhã às 14:00"
                className="px-3 py-1.5 bg-white border border-[#d8e7de] rounded-xl text-xs text-[#142d22] outline-hidden"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#142d22]">Prioridade</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                className="px-3 py-1.5 bg-white border border-[#d8e7de] rounded-xl text-xs text-[#142d22] outline-hidden cursor-pointer"
              >
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreatingTask(false)}
              className="px-3 py-1.5 rounded-xl border border-[#d8e7de] text-[#556b60] hover:bg-[#eaf1ec] font-semibold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-[#12382c] text-white font-bold text-xs hover:bg-[#1a4b3b] transition-colors"
            >
              Criar tarefa
            </button>
          </div>
        </form>
      )}

      {/* 2. Filter Pills: Todas | Pendentes X | Concluídas Y */}
      <div className="flex items-center gap-1.5 border-b border-[#f0f4f1] pb-2">
        <button
          type="button"
          onClick={() => setFilter('todas')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            filter === 'todas'
              ? 'bg-[#12382c] text-white'
              : 'bg-[#f2f6f3] text-[#55695e] hover:bg-[#e7efe9]'
          }`}
        >
          Todas
        </button>

        <button
          type="button"
          onClick={() => setFilter('pendentes')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
            filter === 'pendentes'
              ? 'bg-[#12382c] text-white'
              : 'bg-[#f2f6f3] text-[#55695e] hover:bg-[#e7efe9]'
          }`}
        >
          <span>Pendentes</span>
          <span className="text-[11px] opacity-80">{pendingTasks.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('concluidas')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
            filter === 'concluidas'
              ? 'bg-[#12382c] text-white'
              : 'bg-[#f2f6f3] text-[#55695e] hover:bg-[#e7efe9]'
          }`}
        >
          <span>Concluídas</span>
          <span className="text-[11px] opacity-80">{completedTasks.length}</span>
        </button>
      </div>

      {/* 3. Task Items List */}
      <div className="flex flex-col divide-y divide-[#f0f4f1]">
        {displayedTasks.length === 0 ? (
          <div className="py-8 text-center text-[#7a8e83]">
            <p className="text-xs">Nenhuma tarefa nesta visualização.</p>
          </div>
        ) : (
          displayedTasks.map((task) => (
            <div
              key={task.id}
              className="py-3 flex items-start gap-3 transition-colors group"
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => onToggleTask(task.id)}
                className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 transition-all cursor-pointer ${
                  task.completed
                    ? 'bg-[#059669] border-[#059669] text-white'
                    : 'border-[#b6c7be] hover:border-[#12382c] bg-white'
                }`}
              >
                {task.completed && <HugeIcon icon={CheckIcon} size={12} strokeWidth={3} />}
              </button>

              {/* Task Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`font-semibold text-xs leading-snug ${
                      task.completed
                        ? 'line-through text-[#869b90]'
                        : 'text-[#142d22]'
                    }`}
                  >
                    {task.title}
                  </span>

                  {/* Priority Pill */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${getPriorityStyle(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-1 text-[11px] text-[#71857a]">
                  <div className="flex items-center gap-1.5">
                    <HugeIcon icon={Clock01Icon} size={12} />
                    <span>{task.dueDate}</span>
                    {task.completed && (
                      <span className="text-[#059669] font-semibold ml-1">
                        • Concluída
                      </span>
                    )}
                  </div>

                  {/* Assignee Avatar */}
                  <img
                    src={task.assignedTo.avatar}
                    alt={task.assignedTo.name}
                    title={task.assignedTo.name}
                    referrerPolicy="no-referrer"
                    className="w-4.5 h-4.5 rounded-full object-cover border border-[#dce6df]"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
