import type { InstanceNode } from './instance-tree-builder';

// ── Props ────────────────────────────────────

interface ExplorerInspectorProps {
  node: InstanceNode | null;
}

// ── Value Formatter ──────────────────────────

function formatValue(value: unknown): string {
  if (value === undefined) return '(undefined)';
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return JSON.stringify(value, null, 2);
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function isLargeValue(value: unknown): boolean {
  if (typeof value === 'object' && value !== null) return true;
  if (typeof value === 'string' && value.length > 60) return true;
  return false;
}

// ── Inspector Component ──────────────────────

export function ExplorerInspector({ node }: ExplorerInspectorProps) {
  if (!node) {
    return (
      <div className="explorer-inspector explorer-inspector--empty">
        <div className="placeholder" style={{ padding: '40px 16px' }}>
          <div className="placeholder__icon">◈</div>
          <div className="placeholder__title">Element Inspector</div>
          <div className="placeholder__desc">Click a node in the instance tree to inspect its details.</div>
        </div>
      </div>
    );
  }

  const el = node.element;
  const hasValue = node.value !== undefined;

  return (
    <div className="explorer-inspector">
      <div className="explorer-inspector__header">
        <span>Element Inspector</span>
      </div>
      <div className="explorer-inspector__rows">
        {/* Instance Path */}
        <div className="explorer-inspector__row">
          <span className="explorer-inspector__label">Instance Path</span>
          <span className="explorer-inspector__value explorer-inspector__value--mono">{node.instancePath}</span>
        </div>

        {/* Schema Path */}
        {el && (
          <div className="explorer-inspector__row">
            <span className="explorer-inspector__label">Schema Path</span>
            <span className="explorer-inspector__value explorer-inspector__value--mono">{el.path}</span>
          </div>
        )}

        {/* Node Kind */}
        <div className="explorer-inspector__row">
          <span className="explorer-inspector__label">Kind</span>
          <span className="explorer-inspector__value">
            <span className="explorer-inspector__kind-badge">{node.kind}</span>
          </span>
        </div>

        {/* Type */}
        {el && (
          <div className="explorer-inspector__row">
            <span className="explorer-inspector__label">Type</span>
            <span className="explorer-inspector__value">
              {el.types.length > 0
                ? el.types.map((t, i) => (
                  <span key={i} className="explorer-inspector__type-badge">{t.code}</span>
                ))
                : <span className="explorer-inspector__type-badge explorer-inspector__type-badge--backbone">BackboneElement</span>
              }
            </span>
          </div>
        )}

        {/* Cardinality */}
        {el && (
          <div className="explorer-inspector__row">
            <span className="explorer-inspector__label">Cardinality</span>
            <span className="explorer-inspector__value">
              <span className={`explorer-inspector__cardinality ${el.min > 0 ? 'explorer-inspector__cardinality--required' : ''}`}>
                {el.min}..{el.max === 'unbounded' ? '*' : el.max}
              </span>
              {el.min > 0 && <span className="explorer-inspector__required-badge">Required</span>}
            </span>
          </div>
        )}

        {/* Must Support */}
        {el?.mustSupport && (
          <div className="explorer-inspector__row">
            <span className="explorer-inspector__label">Must Support</span>
            <span className="explorer-inspector__value">
              <span className="explorer-inspector__ms-badge">★ Yes</span>
            </span>
          </div>
        )}

        {/* Choice Type */}
        {node.choiceType && (
          <div className="explorer-inspector__row">
            <span className="explorer-inspector__label">Choice Type</span>
            <span className="explorer-inspector__value">
              <span className="explorer-inspector__type-badge">{node.choiceType}</span>
              {el && el.types.length > 1 && (
                <span className="explorer-inspector__choice-alt">
                  {' '}(of {el.types.map(t => t.code).join(', ')})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Slice Name */}
        {node.sliceName && (
          <div className="explorer-inspector__row">
            <span className="explorer-inspector__label">Slice</span>
            <span className="explorer-inspector__value">
              <span className="explorer-inspector__slice-badge">
                {node.isExtensionSlice ? '🔗' : '🧩'} :{node.sliceName}
              </span>
            </span>
          </div>
        )}

        {/* Reference Targets */}
        {node.referenceTargets && node.referenceTargets.length > 0 && (
          <div className="explorer-inspector__row">
            <span className="explorer-inspector__label">Reference Targets</span>
            <span className="explorer-inspector__value">
              {node.referenceTargets.map((t, i) => (
                <span key={i} className="explorer-inspector__ref-chip">{t}</span>
              ))}
            </span>
          </div>
        )}

        {/* Binding */}
        {el?.binding && (
          <div className="explorer-inspector__row">
            <span className="explorer-inspector__label">Binding</span>
            <span className="explorer-inspector__value">
              <span className={`explorer-inspector__binding-badge explorer-inspector__binding-badge--${el.binding.strength}`}>
                {el.binding.strength}
              </span>
              {el.binding.valueSetUrl && (
                <span className="explorer-inspector__binding-vs">{el.binding.valueSetUrl}</span>
              )}
            </span>
          </div>
        )}

        {/* Constraints */}
        {el && el.constraints.length > 0 && (
          <div className="explorer-inspector__row explorer-inspector__row--block">
            <span className="explorer-inspector__label">Constraints</span>
            <div className="explorer-inspector__constraints">
              {el.constraints.map((c) => (
                <div key={c.key} className="explorer-inspector__constraint">
                  <span className={`explorer-inspector__constraint-key explorer-inspector__constraint-key--${c.severity}`}>
                    {c.key}
                  </span>
                  <span className="explorer-inspector__constraint-text">{c.human}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Value */}
        {hasValue && (
          <div className="explorer-inspector__row explorer-inspector__row--block">
            <span className="explorer-inspector__label">Value</span>
            {isLargeValue(node.value) ? (
              <pre className="explorer-inspector__value-code">{formatValue(node.value)}</pre>
            ) : (
              <span className="explorer-inspector__value explorer-inspector__value--mono">
                {formatValue(node.value)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
