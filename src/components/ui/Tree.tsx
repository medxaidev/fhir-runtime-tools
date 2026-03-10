import { useState } from 'react';
import type { ReactNode } from 'react';

export interface TreeNodeData {
  key: string;
  value?: unknown;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  children?: TreeNodeData[];
}

interface TreeProps {
  data: TreeNodeData[];
  onSelect?: (node: TreeNodeData) => void;
}

export function Tree({ data, onSelect }: TreeProps) {
  return (
    <div>
      {data.map((node) => (
        <TreeNode key={node.key} node={node} depth={0} onSelect={onSelect} />
      ))}
    </div>
  );
}

function TreeNode({ node, depth, onSelect }: { node: TreeNodeData; depth: number; onSelect?: (node: TreeNodeData) => void }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;
  const isExpandable = node.type === 'object' || node.type === 'array';

  const handleClick = () => {
    if (isExpandable) {
      setExpanded((v) => !v);
    }
    onSelect?.(node);
  };

  let displayValue: ReactNode;
  if (node.type === 'array') {
    displayValue = `Array(${Array.isArray(node.value) ? (node.value as unknown[]).length : node.children?.length ?? 0})`;
  } else if (node.type === 'object') {
    displayValue = `{${node.children?.length ?? 0}}`;
  } else if (node.type === 'string') {
    displayValue = `"${String(node.value)}"`;
  } else if (node.type === 'null') {
    displayValue = 'null';
  } else {
    displayValue = String(node.value);
  }

  return (
    <div>
      <div
        className={`tree-node__row ${isExpandable ? 'tree-node__row--expandable' : ''}`}
        style={{ paddingLeft: 10 + depth * 14 }}
        onClick={handleClick}
      >
        {isExpandable && (
          <span className="tree-node__arrow">{expanded ? '▾' : '▸'}</span>
        )}
        <span className="tree-node__key">{node.key}</span>
        <span className="tree-node__value">{displayValue}</span>
      </div>
      {expanded && hasChildren && node.children!.map((child) => (
        <TreeNode key={child.key} node={child} depth={depth + 1} onSelect={onSelect} />
      ))}
    </div>
  );
}
