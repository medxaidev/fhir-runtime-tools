import type { CanonicalProfile, CanonicalElement } from 'fhir-runtime';
import { isBackboneElement, isArrayElement } from '../composer/instance-tree-engine';
import { isChoiceType, getChoiceBaseName, buildChoiceJsonKey } from '../composer/choice-type-engine';
import type { SlicedElementInfo } from '../composer/slice-engine';
import { isSlicedElement, matchSlice, isExtensionSlicing } from '../composer/slice-engine';

// ── Types ────────────────────────────────────

export type InstanceNodeKind = 'resource' | 'element' | 'array-item' | 'slice-item' | 'choice-resolved';

export interface InstanceNode {
  /** Display label, e.g. "name", "name[0]", "valueQuantity" */
  label: string;
  /** Instance path, e.g. "Patient.name[0].family" */
  instancePath: string;
  /** Schema element path, e.g. "Patient.name" */
  elementPath: string;
  /** Canonical element from the profile (if matched) */
  element?: CanonicalElement;
  /** The actual JSON value at this node */
  value?: unknown;
  /** Node kind */
  kind: InstanceNodeKind;
  /** Tree depth for indentation */
  depth: number;
  /** Children */
  children: InstanceNode[];
  /** For array items: the index */
  arrayIndex?: number;
  /** For choice types: the resolved type code */
  choiceType?: string;
  /** For sliced elements: matched slice name */
  sliceName?: string;
  /** Whether this is a backbone element */
  isBackbone: boolean;
  /** Whether the schema element is required */
  isRequired: boolean;
  /** Whether this is an extension slice */
  isExtensionSlice?: boolean;
  /** Reference target types (from schema) */
  referenceTargets?: string[];
}

// ── Build Instance Tree ──────────────────────

export function buildInstanceTree(
  resource: Record<string, unknown>,
  profile: CanonicalProfile,
  slicingMap?: Map<string, SlicedElementInfo>,
): InstanceNode[] {
  const resourceType = profile.type;
  const rootChildren: InstanceNode[] = [];

  // Get top-level elements (depth 1 in schema)
  const topElements: CanonicalElement[] = [];
  for (const [path, el] of profile.elements) {
    const parts = path.split('.');
    if (parts.length === 2) topElements.push(el);
  }

  // Walk resource keys and match to schema elements
  const processedKeys = new Set<string>();

  for (const el of topElements) {
    const name = el.path.split('.').pop()!;

    // Choice type: scan resource for concrete key
    if (isChoiceType(el)) {
      const baseName = getChoiceBaseName(el.path);
      for (const typeInfo of el.types) {
        const jsonKey = buildChoiceJsonKey(baseName, typeInfo.code);
        if (jsonKey in resource) {
          processedKeys.add(jsonKey);
          const val = resource[jsonKey];
          const node = buildValueNode(
            jsonKey,
            `${resourceType}.${name}`,
            `${resourceType}.${jsonKey}`,
            val,
            el,
            profile,
            slicingMap,
            1,
          );
          node.kind = 'choice-resolved';
          node.choiceType = typeInfo.code;
          rootChildren.push(node);
          break; // only one choice variant active
        }
      }
      continue;
    }

    // Regular element
    if (!(name in resource)) continue;
    processedKeys.add(name);

    const val = resource[name];
    const isBb = isBackboneElement(el);
    const isArr = isArrayElement(el);
    const isSliced = slicingMap ? isSlicedElement(el.path, slicingMap) : false;

    if (isBb && isArr && Array.isArray(val)) {
      // Backbone array: create parent + children per index
      const parentNode: InstanceNode = {
        label: name,
        instancePath: `${resourceType}.${name}`,
        elementPath: el.path,
        element: el,
        value: val,
        kind: 'element',
        depth: 1,
        children: [],
        isBackbone: true,
        isRequired: el.min > 0,
      };

      for (let i = 0; i < val.length; i++) {
        const item = val[i] as Record<string, unknown>;
        const itemNode = buildArrayItemNode(
          name, i, item, el, profile, slicingMap, 2,
        );

        // Slice matching
        if (isSliced && slicingMap) {
          const slicedInfo = slicingMap.get(el.path);
          if (slicedInfo) {
            const matched = matchSlice(item, slicedInfo);
            if (matched) {
              itemNode.sliceName = matched;
              itemNode.kind = 'slice-item';
              itemNode.label = `${name}[${i}] :${matched}`;
              if (isExtensionSlicing(el.path, slicingMap)) {
                itemNode.isExtensionSlice = true;
              }
            }
          }
        }

        parentNode.children.push(itemNode);
      }
      rootChildren.push(parentNode);
    } else if (isArr && Array.isArray(val)) {
      // Primitive/complex array
      const parentNode: InstanceNode = {
        label: name,
        instancePath: `${resourceType}.${name}`,
        elementPath: el.path,
        element: el,
        value: val,
        kind: 'element',
        depth: 1,
        children: [],
        isBackbone: false,
        isRequired: el.min > 0,
      };

      for (let i = 0; i < val.length; i++) {
        parentNode.children.push({
          label: `${name}[${i}]`,
          instancePath: `${resourceType}.${name}[${i}]`,
          elementPath: el.path,
          element: el,
          value: val[i],
          kind: 'array-item',
          depth: 2,
          children: [],
          arrayIndex: i,
          isBackbone: false,
          isRequired: false,
        });
      }
      rootChildren.push(parentNode);
    } else if (isBb && typeof val === 'object' && val !== null && !Array.isArray(val)) {
      // Single backbone object
      const node = buildValueNode(
        name,
        el.path,
        `${resourceType}.${name}`,
        val,
        el,
        profile,
        slicingMap,
        1,
      );
      rootChildren.push(node);
    } else {
      // Scalar / simple object
      const refTargets = el.types
        .filter(t => t.code === 'Reference' && t.targetProfiles)
        .flatMap(t => (t.targetProfiles ?? []).map((u: string) => u.split('/').pop()!));

      rootChildren.push({
        label: name,
        instancePath: `${resourceType}.${name}`,
        elementPath: el.path,
        element: el,
        value: val,
        kind: 'element',
        depth: 1,
        children: [],
        isBackbone: false,
        isRequired: el.min > 0,
        referenceTargets: refTargets.length > 0 ? refTargets : undefined,
      });
    }
  }

  // Catch unknown keys (not in schema)
  for (const key of Object.keys(resource)) {
    if (key === 'resourceType') continue;
    if (processedKeys.has(key)) continue;
    rootChildren.push({
      label: key,
      instancePath: `${resourceType}.${key}`,
      elementPath: '',
      value: resource[key],
      kind: 'element',
      depth: 1,
      children: [],
      isBackbone: false,
      isRequired: false,
    });
  }

  return rootChildren;
}

// ── Helpers ──────────────────────────────────

function buildArrayItemNode(
  name: string,
  index: number,
  item: Record<string, unknown>,
  parentElement: CanonicalElement,
  profile: CanonicalProfile,
  slicingMap: Map<string, SlicedElementInfo> | undefined,
  depth: number,
): InstanceNode {
  const children: InstanceNode[] = [];

  // Get backbone child elements from schema
  const prefix = parentElement.path + '.';
  for (const [path, childEl] of profile.elements) {
    if (!path.startsWith(prefix)) continue;
    const rest = path.slice(prefix.length);
    if (rest.includes('.')) continue; // direct children only

    const childName = rest;
    if (!(childName in item)) continue;

    const childVal = item[childName];
    const childNode = buildValueNode(
      childName,
      childEl.path,
      `${parentElement.path}[${index}].${childName}`,
      childVal,
      childEl,
      profile,
      slicingMap,
      depth + 1,
    );
    children.push(childNode);
  }

  return {
    label: `${name}[${index}]`,
    instancePath: `${parentElement.path}[${index}]`,
    elementPath: parentElement.path,
    element: parentElement,
    value: item,
    kind: 'array-item',
    depth,
    children,
    arrayIndex: index,
    isBackbone: true,
    isRequired: false,
  };
}

function buildValueNode(
  name: string,
  elementPath: string,
  instancePath: string,
  value: unknown,
  element: CanonicalElement,
  profile: CanonicalProfile,
  slicingMap: Map<string, SlicedElementInfo> | undefined,
  depth: number,
): InstanceNode {
  const children: InstanceNode[] = [];
  const isBb = isBackboneElement(element);

  // If backbone and value is object, recurse into child elements
  if (isBb && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const prefix = elementPath + '.';
    for (const [path, childEl] of profile.elements) {
      if (!path.startsWith(prefix)) continue;
      const rest = path.slice(prefix.length);
      if (rest.includes('.')) continue;

      const childName = rest;
      if (!(childName in obj)) continue;

      const childVal = obj[childName];
      const childNode = buildValueNode(
        childName,
        childEl.path,
        `${instancePath}.${childName}`,
        childVal,
        childEl,
        profile,
        slicingMap,
        depth + 1,
      );
      children.push(childNode);
    }
  }

  const refTargets = element.types
    .filter(t => t.code === 'Reference' && t.targetProfiles)
    .flatMap(t => (t.targetProfiles ?? []).map((u: string) => u.split('/').pop()!));

  return {
    label: name,
    instancePath,
    elementPath,
    element,
    value,
    kind: 'element',
    depth,
    children,
    isBackbone: isBb,
    isRequired: element.min > 0,
    referenceTargets: refTargets.length > 0 ? refTargets : undefined,
  };
}
