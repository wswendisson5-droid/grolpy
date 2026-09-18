import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

export type FilterType =
  | 'Todos'
  | 'Lojas'
  | 'Serviços'
  | 'Produtos'
  | 'Não atribuídas'
  | 'Alta prioridade'
  | 'Recentes';

interface QuickFiltersProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export const QuickFilters: React.FC<QuickFiltersProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  const filters: FilterType[] = [
    'Todos',
    'Lojas',
    'Serviços',
    'Produtos',
    'Não atribuídas',
    'Alta prioridade',
    'Recentes',
  ];

  return (
    <div
      id="quick-filters-card"
      className="bg-white rounded-2xl p-4 border border-[#e8eee9] shadow-[0_1px_3px_rgba(18,56,44,0.02)] flex flex-col gap-3 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[13.5px] font-bold text-[#142d23]">
          Filtros rápidos
        </h2>
        <button
          id="filter-options-toggle-btn"
          aria-label="Opções de filtros"
          className="text-[#64766d] hover:text-[#18392d] transition-colors p-1"
        >
          <SlidersHorizontal size={14} />
        </button>
      </div>

      {/* Pill Chips */}
      <div className="flex flex-wrap gap-1.5">
        {filters.map((filter) => {
          const isActive = activeFilter === filter;

          return (
            <button
              key={filter}
              id={`filter-chip-${filter.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => onFilterChange(filter)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#14382b] text-white shadow-xs font-semibold'
                  : 'bg-[#f1f5f3] text-[#4d5c54] hover:bg-[#e6ece8] hover:text-[#193227]'
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>
    </div>
  );
};
