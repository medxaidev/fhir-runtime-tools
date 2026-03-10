import { useState, useMemo } from 'react';

interface ResourceListProps {
  resourceTypes: string[];
  selectedType: string | null;
  onSelect: (type: string) => void;
  loading?: boolean;
}

export function ResourceList({ resourceTypes, selectedType, onSelect, loading }: ResourceListProps) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter) return resourceTypes;
    const lower = filter.toLowerCase();
    return resourceTypes.filter((t) => t.toLowerCase().includes(lower));
  }, [resourceTypes, filter]);

  return (
    <div className="resource-list">
      <div className="resource-list__header">
        <span className="resource-list__title">FHIR Resources</span>
        <span className="resource-list__count">{resourceTypes.length}</span>
      </div>
      <div className="resource-list__search">
        <input
          className="input"
          type="text"
          placeholder="Filter resources..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="resource-list__items">
        {loading ? (
          <div className="resource-list__loading">Loading profiles...</div>
        ) : filtered.length === 0 ? (
          <div className="resource-list__empty">No resources found</div>
        ) : (
          filtered.map((type) => (
            <button
              key={type}
              className={`resource-list__item ${selectedType === type ? 'resource-list__item--active' : ''}`}
              onClick={() => onSelect(type)}
            >
              <span className="resource-list__item-icon">R</span>
              {type}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
