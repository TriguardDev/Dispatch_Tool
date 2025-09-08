import React, { useState } from "react";
import { useTheme } from "@mui/material/styles";

interface Agent {
  agentId: string;
  name: string;
  distance: string;
}

interface AgentSelectorProps {
  agents: Agent[];
  selectedRep: string;
  loading: boolean;
  onChange: (repId: string) => void;
  onSearch: () => void;
  disabledSearch: boolean;
}

export default function AgentSelector({
  agents,
  selectedRep,
  loading,
  onChange,
  onSearch,
  disabledSearch,
}: AgentSelectorProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const getDistanceColor = (distance: number) => {
    if (distance > 50) return "text-red-600";
    if (distance > 25) return "text-yellow-600";
    return "text-green-600";
  };

  const selectedAgent = agents.find(a => a.agentId === selectedRep);

  return (
    <div className="md:col-span-2 flex flex-col md:flex-row items-end gap-3 relative">
      {/* Custom Select */}
      <div className="flex-1 relative">
        <label className="label font-medium text-gray-200 ">
          Assign Rep
        </label>
        <div
          className="w-full border border-gray-700 rounded-lg px-3 py-2 cursor-pointer flex justify-between items-center"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedAgent
            ? `${selectedAgent.name} - ${Math.ceil(Number(selectedAgent.distance))} km`
            : loading
            ? "Searching..."
            : agents.length > 0
            ? "Select an agent"
            : "No agents found"}
          <span className="ml-2">▼</span>
        </div>

        {isOpen && agents.length > 0 && (
          <div 
            className="absolute mt-1 w-full max-h-60 overflow-y-auto border rounded-lg shadow-lg z-50"
            style={{ 
              backgroundColor: theme.palette.background.paper,
              borderColor: theme.palette.divider 
            }}
          >
            {agents.map((agent) => {
              const distance = Math.ceil(Number(agent.distance));
              const color = getDistanceColor(distance);
              return (
                <div
                  key={agent.agentId}
                  className="px-3 py-2 cursor-pointer flex justify-between"
                  style={{ 
                    backgroundColor: selectedRep === agent.agentId ? theme.palette.action.selected : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedRep !== agent.agentId) {
                      e.currentTarget.style.backgroundColor = theme.palette.action.hover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedRep !== agent.agentId) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  onClick={() => {
                    onChange(agent.agentId);
                    setIsOpen(false);
                  }}
                >
                  <span style={{ color: theme.palette.text.primary }}>{agent.name}</span>
                  <span className={`${color} font-semibold`}>{distance} km</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Search Button */}
      <button
        type="button"
        className="btn btn-primary h-12 px-5 rounded-lg hover:bg-blue-600 transition-colors"
        onClick={onSearch}
        disabled={disabledSearch}
      >
        Search
      </button>
    </div>
  );
}
