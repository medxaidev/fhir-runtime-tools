import { useMemo } from 'react';
import { getExamplesForType, EXAMPLE_LIBRARY } from '../../data/example-library';
import type { ExampleEntry } from '../../data/example-library';

interface ExampleLoaderProps {
  selectedResourceType: string | null;
  onLoad: (example: ExampleEntry) => void;
}

export function ExampleLoader({ selectedResourceType, onLoad }: ExampleLoaderProps) {
  const examples = useMemo(() => {
    if (selectedResourceType) {
      return getExamplesForType(selectedResourceType);
    }
    return EXAMPLE_LIBRARY;
  }, [selectedResourceType]);

  const validExamples = examples.filter((e) => e.category === 'valid');
  const errorExamples = examples.filter((e) => e.category === 'error');

  if (examples.length === 0) {
    return (
      <select className="example-loader__select" disabled>
        <option>No examples available</option>
      </select>
    );
  }

  return (
    <select
      className="example-loader__select"
      value=""
      onChange={(e) => {
        const example = EXAMPLE_LIBRARY.find((ex) => ex.id === e.target.value);
        if (example) onLoad(example);
      }}
    >
      <option value="" disabled>
        Load Example{selectedResourceType ? ` (${selectedResourceType})` : ''}...
      </option>
      {validExamples.length > 0 && (
        <optgroup label="✓ Valid Examples">
          {validExamples.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.title}</option>
          ))}
        </optgroup>
      )}
      {errorExamples.length > 0 && (
        <optgroup label="✗ Error Examples">
          {errorExamples.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.title}</option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
