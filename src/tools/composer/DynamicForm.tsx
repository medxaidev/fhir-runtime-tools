import { useCallback } from 'react';
import type { CanonicalProfile, CanonicalElement } from 'fhir-runtime';
import { generateElementDefault } from '../validator/SchemaViewer';
import {
  isChoiceType,
  resolveChoiceType,
} from './choice-type-engine';
import {
  isBackboneElement,
  getBackboneChildren,
} from './instance-tree-engine';
import {
  isSlicedElement,
  matchSlice,
  getSlicingInfo,
} from './slice-engine';
import type { SlicedElementInfo } from './slice-engine';

interface DynamicFormProps {
  element: CanonicalElement | null;
  profile: CanonicalProfile | null;
  value: unknown;
  resource: Record<string, unknown>;
  instanceIndex?: number | null;
  slicingMap?: Map<string, SlicedElementInfo>;
  onChange: (elementPath: string, value: unknown) => void;
  onChoiceSwitch?: (element: CanonicalElement, typeCode: string) => void;
}

// ── Type-specific field renderers ────────────

function StringField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      className="composer-form__input"
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter value..."
    />
  );
}

function NumberField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      className="composer-form__input"
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

function BooleanField({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="composer-form__checkbox-label">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{value ? 'true' : 'false'}</span>
    </label>
  );
}

function CodeField({ value, onChange, binding }: { value: string; onChange: (v: string) => void; binding?: string }) {
  return (
    <div className="composer-form__code-field">
      <input
        className="composer-form__input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter code..."
      />
      {binding && <span className="composer-form__binding-hint">Binding: {binding}</span>}
    </div>
  );
}

// ── Choice Type Field ───────────────────────

function ChoiceTypeField({
  element,
  resource,
  onChoiceSwitch,
  onChange,
}: {
  element: CanonicalElement;
  resource: Record<string, unknown>;
  onChoiceSwitch?: (el: CanonicalElement, typeCode: string) => void;
  onChange: (val: unknown) => void;
}) {
  const info = resolveChoiceType(element, resource);

  return (
    <div className="composer-form__choice">
      <div className="composer-form__choice-selector">
        <span className="composer-form__choice-label">Type</span>
        <select
          className="composer-form__select"
          value={info.activeType ?? ''}
          onChange={(e) => {
            if (e.target.value) onChoiceSwitch?.(element, e.target.value);
          }}
        >
          <option value="">Select type...</option>
          {info.availableTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      {info.activeType && info.activeJsonKey && (
        <div className="composer-form__choice-value">
          <span className="composer-form__sub-label">{info.activeJsonKey}</span>
          {(() => {
            const val = resource[info.activeJsonKey];
            if (val === undefined || val === null) return null;
            if (typeof val === 'string') return (
              <StringField value={val} onChange={onChange as (v: string) => void} />
            );
            if (typeof val === 'number') return (
              <NumberField value={val} onChange={onChange as (v: number) => void} />
            );
            if (typeof val === 'boolean') return (
              <BooleanField value={val} onChange={onChange as (v: boolean) => void} />
            );
            if (typeof val === 'object' && !Array.isArray(val)) return (
              <ObjectField
                value={val as Record<string, unknown>}
                onChange={onChange as (v: Record<string, unknown>) => void}
              />
            );
            return null;
          })()}
        </div>
      )}
    </div>
  );
}

// ── Object field (renders sub-fields) ───────

function ObjectField({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (updated: Record<string, unknown>) => void;
}) {
  const keys = Object.keys(value);

  const handleSubChange = useCallback((key: string, subVal: unknown) => {
    onChange({ ...value, [key]: subVal });
  }, [value, onChange]);

  return (
    <div className="composer-form__object">
      {keys.map((key) => {
        const subVal = value[key];
        return (
          <div key={key} className="composer-form__sub-field">
            <label className="composer-form__sub-label">{key}</label>
            {typeof subVal === 'string' && (
              <StringField value={subVal} onChange={(v) => handleSubChange(key, v)} />
            )}
            {typeof subVal === 'number' && (
              <NumberField value={subVal} onChange={(v) => handleSubChange(key, v)} />
            )}
            {typeof subVal === 'boolean' && (
              <BooleanField value={subVal} onChange={(v) => handleSubChange(key, v)} />
            )}
            {typeof subVal === 'object' && subVal !== null && !Array.isArray(subVal) && (
              <ObjectField
                value={subVal as Record<string, unknown>}
                onChange={(v) => handleSubChange(key, v)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Array field ─────────────────────────────

function ArrayField({
  value,
  element,
  onChange,
}: {
  value: unknown[];
  element: CanonicalElement;
  onChange: (updated: unknown[]) => void;
}) {
  const handleItemChange = useCallback((index: number, itemVal: unknown) => {
    const updated = [...value];
    updated[index] = itemVal;
    onChange(updated);
  }, [value, onChange]);

  const handleAdd = useCallback(() => {
    const defaultVal = generateElementDefault(element);
    onChange([...value, defaultVal]);
  }, [value, element, onChange]);

  const handleRemove = useCallback((index: number) => {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);
  }, [value, onChange]);

  return (
    <div className="composer-form__array">
      <div className="composer-form__array-header">
        <span className="composer-form__array-count">{value.length} item(s)</span>
        <button className="btn btn--small btn--ghost" onClick={handleAdd}>+ Add</button>
      </div>
      {value.map((item, idx) => (
        <div key={idx} className="composer-form__array-item">
          <div className="composer-form__array-item-header">
            <span className="composer-form__array-item-index">[{idx}]</span>
            <button
              className="composer-tree-node__btn composer-tree-node__btn--remove"
              onClick={() => handleRemove(idx)}
              title="Remove item"
            >×</button>
          </div>
          {typeof item === 'string' && (
            <StringField value={item} onChange={(v) => handleItemChange(idx, v)} />
          )}
          {typeof item === 'number' && (
            <NumberField value={item} onChange={(v) => handleItemChange(idx, v)} />
          )}
          {typeof item === 'boolean' && (
            <BooleanField value={item} onChange={(v) => handleItemChange(idx, v)} />
          )}
          {typeof item === 'object' && item !== null && !Array.isArray(item) && (
            <ObjectField
              value={item as Record<string, unknown>}
              onChange={(v) => handleItemChange(idx, v)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Dynamic Form ───────────────────────

export function DynamicForm({ element, profile, value, resource, instanceIndex, slicingMap, onChange, onChoiceSwitch }: DynamicFormProps) {
  if (!element) {
    return (
      <div className="composer-form composer-form--empty">
        <div className="placeholder" style={{ padding: '40px 16px' }}>
          <div className="placeholder__icon">✎</div>
          <div className="placeholder__title">Dynamic Form</div>
          <div className="placeholder__desc">Click an element in the tree to edit its value.</div>
        </div>
      </div>
    );
  }

  const name = element.path.split('.').pop() ?? '';
  const typeCode = element.types.length > 0 ? element.types[0].code : 'BackboneElement';
  const isArray = element.max === 'unbounded' || (typeof element.max === 'number' && element.max > 1);
  const isRequired = element.min > 0;
  const isChoice = isChoiceType(element);
  const isBackbone = isBackboneElement(element);
  const isBackboneInstance = isBackbone && isArray && instanceIndex !== null && instanceIndex !== undefined;
  const isSliced = slicingMap ? isSlicedElement(element.path, slicingMap) : false;
  const bindingVS = element.binding?.valueSetUrl ?? undefined;

  // Slice info for the current instance
  const sliceInfo = isSliced && slicingMap ? getSlicingInfo(element.path, slicingMap) : null;
  const matchedSliceName = isSliced && slicingMap && instanceIndex !== null && typeof value === 'object' && value !== null
    ? matchSlice(value as Record<string, unknown>, slicingMap.get(element.path)!)
    : null;

  const handleChange = useCallback((newVal: unknown) => {
    onChange(element.path, newVal);
  }, [element.path, onChange]);

  // For choice types, resolve the active JSON key and use that for onChange
  const choiceInfo = isChoice ? resolveChoiceType(element, resource) : null;

  const handleChoiceValueChange = useCallback((newVal: unknown) => {
    if (choiceInfo?.activeJsonKey) {
      onChange(`${element.path.split('.')[0]}.${choiceInfo.activeJsonKey}`, newVal);
    }
  }, [element.path, choiceInfo, onChange]);

  // For backbone instances, get the child elements from the profile
  const backboneChildren = isBackboneInstance && profile
    ? getBackboneChildren(element.path, profile.elements)
    : [];

  // Get the instance value (should be an object)
  const instanceValue = isBackboneInstance && typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : null;

  return (
    <div className="composer-form">
      <div className="composer-form__header">
        <span className="composer-form__element-name">
          {isBackboneInstance ? `${name}[${instanceIndex}]` : name}
        </span>
        {isChoice ? (
          <span className="composer-form__choice-badge">[x]</span>
        ) : isBackbone ? (
          <span className="composer-form__backbone-badge">⧉ Backbone</span>
        ) : (
          <span className="composer-form__element-type">{typeCode}</span>
        )}
        {isSliced && <span className="composer-form__slice-badge">🧩 sliced</span>}
        {isRequired && <span className="composer-form__required-badge">Required</span>}
        {isArray && !isBackboneInstance && <span className="composer-form__array-badge">Array</span>}
      </div>

      <div className="composer-form__info">
        <div className="composer-form__info-row">
          <span className="composer-form__info-label">Path</span>
          <span className="composer-form__info-value">
            {isBackboneInstance ? `${element.path}[${instanceIndex}]` : element.path}
          </span>
        </div>
        <div className="composer-form__info-row">
          <span className="composer-form__info-label">Cardinality</span>
          <span className="composer-form__info-value">
            {element.min}..{element.max === 'unbounded' ? '*' : element.max}
          </span>
        </div>
        {isChoice && choiceInfo?.activeType && (
          <div className="composer-form__info-row">
            <span className="composer-form__info-label">Active Type</span>
            <span className="composer-form__info-value">{choiceInfo.activeType}</span>
          </div>
        )}
        {matchedSliceName && (
          <div className="composer-form__info-row">
            <span className="composer-form__info-label">Slice</span>
            <span className="composer-form__info-value">:{matchedSliceName}</span>
          </div>
        )}
        {sliceInfo && (
          <div className="composer-form__slice-info">
            <span className="composer-form__slice-info-label">Slicing</span>
            <span className="composer-form__slice-info-value">
              discriminator: {sliceInfo.discriminator.map(d => `${d.type}@${d.path}`).join(', ')} | rules: {sliceInfo.rules}
            </span>
          </div>
        )}
      </div>

      <div className="composer-form__body">
        {isBackboneInstance && instanceValue !== null ? (
          <div className="composer-form__backbone">
            {backboneChildren.map((childEl) => {
              const childName = childEl.path.split('.').pop() ?? '';
              const childVal = instanceValue[childName];
              const childType = childEl.types.length > 0 ? childEl.types[0].code : 'BackboneElement';
              return (
                <div key={childEl.path} className="composer-form__backbone-field">
                  <div className="composer-form__backbone-field-header">
                    <span className="composer-form__sub-label">{childName}</span>
                    <span className="composer-form__backbone-field-type">{childType}</span>
                    {childEl.min > 0 && <span className="composer-form__required-dot">●</span>}
                  </div>
                  {childVal === undefined ? (
                    <button
                      className="btn btn--small btn--ghost"
                      onClick={() => {
                        const defaultVal = generateElementDefault(childEl);
                        const updated = { ...instanceValue, [childName]: defaultVal };
                        onChange(element.path, updated);
                      }}
                    >+ Add {childName}</button>
                  ) : typeof childVal === 'string' ? (
                    <StringField
                      value={childVal}
                      onChange={(v) => {
                        onChange(`${element.path}.${childName}`, v);
                      }}
                    />
                  ) : typeof childVal === 'number' ? (
                    <NumberField
                      value={childVal}
                      onChange={(v) => {
                        onChange(`${element.path}.${childName}`, v);
                      }}
                    />
                  ) : typeof childVal === 'boolean' ? (
                    <BooleanField
                      value={childVal}
                      onChange={(v) => {
                        onChange(`${element.path}.${childName}`, v);
                      }}
                    />
                  ) : typeof childVal === 'object' && childVal !== null && !Array.isArray(childVal) ? (
                    <ObjectField
                      value={childVal as Record<string, unknown>}
                      onChange={(v) => {
                        onChange(`${element.path}.${childName}`, v);
                      }}
                    />
                  ) : Array.isArray(childVal) ? (
                    <ArrayField
                      value={childVal}
                      element={childEl}
                      onChange={(v) => {
                        onChange(`${element.path}.${childName}`, v);
                      }}
                    />
                  ) : (
                    <span className="composer-form__unsupported">Unsupported</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : isChoice ? (
          <ChoiceTypeField
            element={element}
            resource={resource}
            onChoiceSwitch={onChoiceSwitch}
            onChange={handleChoiceValueChange}
          />
        ) : value === undefined ? (
          <div className="composer-form__not-set">
            <span>Element not set in resource.</span>
            <button
              className="btn btn--small btn--ghost"
              onClick={() => {
                const defaultVal = generateElementDefault(element);
                const val = isArray ? [defaultVal] : defaultVal;
                handleChange(val);
              }}
            >
              + Add to resource
            </button>
          </div>
        ) : isArray && Array.isArray(value) ? (
          <ArrayField value={value} element={element} onChange={handleChange} />
        ) : typeof value === 'string' ? (
          typeCode === 'code' ? (
            <CodeField value={value} onChange={handleChange as (v: string) => void} binding={bindingVS} />
          ) : (
            <StringField value={value} onChange={handleChange as (v: string) => void} />
          )
        ) : typeof value === 'number' ? (
          <NumberField value={value} onChange={handleChange as (v: number) => void} />
        ) : typeof value === 'boolean' ? (
          <BooleanField value={value} onChange={handleChange as (v: boolean) => void} />
        ) : typeof value === 'object' && value !== null && !Array.isArray(value) ? (
          <ObjectField
            value={value as Record<string, unknown>}
            onChange={handleChange as (v: Record<string, unknown>) => void}
          />
        ) : (
          <div className="composer-form__unsupported">Unsupported type: {typeof value}</div>
        )}
      </div>

      {element.constraints.length > 0 && (
        <div className="composer-form__constraints">
          <span className="composer-form__constraints-title">Constraints</span>
          {element.constraints.map((c) => (
            <div key={c.key} className="composer-form__constraint">
              <span className="composer-form__constraint-key">{c.key}</span>
              <span className="composer-form__constraint-text">{c.human}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
