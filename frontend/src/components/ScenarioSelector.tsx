import React from 'react';
import { RoleplayScenario } from '../types.ts';
import {
  Briefcase,
  Building2,
  Stethoscope,
  GraduationCap,
  Home,
  Coffee,
  MessageSquare,
  HelpCircle,
  ChevronRight,
  Target,
} from 'lucide-react';

interface ScenarioSelectorProps {
  scenarios: RoleplayScenario[];
  selectedScenarioId: string;
  onSelectScenario: (scenario: RoleplayScenario) => void;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
}) => {
  const getIcon = (name: string) => {
    switch (name) {
      case 'Briefcase':
        return <Briefcase className="w-4 h-4 text-orange-400" />;
      case 'Building2':
        return <Building2 className="w-4 h-4 text-blue-400" />;
      case 'Stethoscope':
        return <Stethoscope className="w-4 h-4 text-emerald-400" />;
      case 'GraduationCap':
        return <GraduationCap className="w-4 h-4 text-purple-400" />;
      case 'Home':
        return <Home className="w-4 h-4 text-amber-400" />;
      case 'Coffee':
        return <Coffee className="w-4 h-4 text-rose-400" />;
      case 'MessageSquare':
        return <MessageSquare className="w-4 h-4 text-cyan-400" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'B1.1':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'B1.2':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'B2.1':
        return 'bg-orange-50 text-[#FF4F00] border-orange-200';
      case 'B2.2':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="w-full">
      {/* Scrollable horizontal selector for mobile/desktop */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {scenarios.map((scenario) => {
          const isSelected = scenario.id === selectedScenarioId;
          return (
            <button
              key={scenario.id}
              id={`scenario-tab-${scenario.id}`}
              onClick={() => onSelectScenario(scenario)}
              className={`flex shrink-0 items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left transition-all duration-150 ${
                isSelected
                  ? 'border-[#FF4F00] bg-white shadow-sm ring-1 ring-[#FF4F00]/30'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs text-slate-600 hover:text-slate-900'
              }`}
            >
              <img
                src={scenario.avatar}
                alt={scenario.characterName}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0 shadow-xs"
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold truncate max-w-[130px] sm:max-w-[160px] ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                    {scenario.titleNl}
                  </span>
                  <span className={`text-[10px] font-bold uppercase border px-1.5 py-0.2 rounded-md ${getLevelBadgeClass(scenario.level)}`}>
                    {scenario.level}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                  {scenario.characterName} • {scenario.category}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
