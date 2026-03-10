// ── FHIR Resource Example Library ────────────
// Structured, reusable FHIR resource examples for validation, testing, and learning.

export type ExampleCategory = 'valid' | 'error';

export interface ExampleEntry {
  id: string;
  resourceType: string;
  title: string;
  description: string;
  category: ExampleCategory;
  tags: string[];
  json: string;
}

// ── Patient Examples ─────────────────────────

const PATIENT_VALID_BASIC: ExampleEntry = {
  id: 'patient-valid-basic',
  resourceType: 'Patient',
  title: 'Patient – Basic',
  description: 'Valid Patient with name, gender, birthDate, address, and telecom.',
  category: 'valid',
  tags: ['demographics'],
  json: JSON.stringify({
    resourceType: 'Patient',
    id: 'example-patient',
    meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00Z' },
    text: { status: 'generated', div: '<div xmlns="http://www.w3.org/1999/xhtml">John Doe</div>' },
    identifier: [{ system: 'http://hospital.example.org/patients', value: '12345' }],
    active: true,
    name: [{ use: 'official', family: 'Doe', given: ['John', 'Michael'] }],
    gender: 'male',
    birthDate: '1990-06-15',
    address: [{ use: 'home', line: ['123 Main St'], city: 'Springfield', state: 'IL', postalCode: '62704', country: 'US' }],
    telecom: [
      { system: 'phone', value: '+1-555-0123', use: 'home' },
      { system: 'email', value: 'john.doe@example.com' },
    ],
  }, null, 2),
};

const PATIENT_VALID_MINIMAL: ExampleEntry = {
  id: 'patient-valid-minimal',
  resourceType: 'Patient',
  title: 'Patient – Minimal',
  description: 'Minimal valid Patient with only resourceType and id.',
  category: 'valid',
  tags: ['minimal'],
  json: JSON.stringify({ resourceType: 'Patient', id: 'minimal-patient' }, null, 2),
};

const PATIENT_VALID_CONTACT: ExampleEntry = {
  id: 'patient-valid-contact',
  resourceType: 'Patient',
  title: 'Patient – With Contact',
  description: 'Patient with emergency contact information.',
  category: 'valid',
  tags: ['contact', 'demographics'],
  json: JSON.stringify({
    resourceType: 'Patient',
    id: 'patient-with-contact',
    name: [{ use: 'official', family: 'Smith', given: ['Jane'] }],
    gender: 'female',
    birthDate: '1985-03-22',
    contact: [{
      relationship: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0131', code: 'N', display: 'Next-of-Kin' }] }],
      name: { family: 'Smith', given: ['Robert'] },
      telecom: [{ system: 'phone', value: '+1-555-9876', use: 'home' }],
    }],
  }, null, 2),
};

const PATIENT_VALID_MULTI_ID: ExampleEntry = {
  id: 'patient-valid-multi-id',
  resourceType: 'Patient',
  title: 'Patient – Multiple Identifiers',
  description: 'Patient with SSN and MRN identifiers.',
  category: 'valid',
  tags: ['identifier'],
  json: JSON.stringify({
    resourceType: 'Patient',
    id: '0fedb502-9a38-4990-8bab-24debe2d332b',
    identifier: [
      { system: 'http://hl7.org/fhir/sid/us-ssn', value: '111223333' },
      { system: 'http://hospital.example.org/mrn', value: 'MRN-00123' },
    ],
    name: [
      { use: 'official', family: 'Madison', given: ['Katherine', 'Jones'] },
      { family: 'Madison', given: ['Kathy', 'Jones'] },
    ],
    gender: 'female',
    birthDate: '1970-06-01',
    address: [{ line: ['1001 Amber Dr'], city: 'Beaverton', state: 'OR', postalCode: '97006', country: 'US' }],
    telecom: [
      { system: 'phone', value: '+1(555)-111-1234' },
      { system: 'phone', value: '+1(555)-112-1544' },
    ],
  }, null, 2),
};

const PATIENT_VALID_DECEASED: ExampleEntry = {
  id: 'patient-valid-deceased',
  resourceType: 'Patient',
  title: 'Patient – Deceased',
  description: 'Patient marked as deceased with dateTime.',
  category: 'valid',
  tags: ['deceased'],
  json: JSON.stringify({
    resourceType: 'Patient',
    id: 'deceased-patient',
    name: [{ use: 'official', family: 'Johnson', given: ['Robert'] }],
    gender: 'male',
    birthDate: '1940-08-10',
    deceasedDateTime: '2023-12-01T14:30:00Z',
  }, null, 2),
};

const PATIENT_ERROR_INVALID_GENDER: ExampleEntry = {
  id: 'patient-error-invalid-gender',
  resourceType: 'Patient',
  title: 'Patient Error – Invalid Gender',
  description: 'Patient with an invalid gender value and wrong data types.',
  category: 'error',
  tags: ['error', 'type-mismatch'],
  json: JSON.stringify({
    resourceType: 'Patient',
    id: 'invalid-patient',
    active: 'yes',
    birthDate: 'not-a-date',
    gender: 'unknown-value',
    name: 'not-an-array',
  }, null, 2),
};

const PATIENT_ERROR_WRONG_TYPE: ExampleEntry = {
  id: 'patient-error-wrong-type',
  resourceType: 'Patient',
  title: 'Patient Error – Wrong Data Types',
  description: 'Patient with wrong data types for active and birthDate.',
  category: 'error',
  tags: ['error', 'type-mismatch'],
  json: JSON.stringify({
    resourceType: 'Patient',
    id: 'wrong-types',
    active: 123,
    birthDate: true,
    name: [{ family: 456, given: 'not-array' }],
  }, null, 2),
};

// ── Observation Examples ─────────────────────

const OBS_VALID_HEART_RATE: ExampleEntry = {
  id: 'observation-heart-rate',
  resourceType: 'Observation',
  title: 'Observation – Heart Rate',
  description: 'Heart rate vital sign observation with valueQuantity.',
  category: 'valid',
  tags: ['vital-signs'],
  json: JSON.stringify({
    resourceType: 'Observation',
    id: 'heart-rate-obs',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }], text: 'Heart rate' },
    subject: { reference: 'Patient/example-patient' },
    effectiveDateTime: '2024-01-15T10:00:00Z',
    valueQuantity: { value: 72, unit: 'beats/minute', system: 'http://unitsofmeasure.org', code: '/min' },
  }, null, 2),
};

const OBS_VALID_BLOOD_PRESSURE: ExampleEntry = {
  id: 'observation-blood-pressure',
  resourceType: 'Observation',
  title: 'Observation – Blood Pressure',
  description: 'Blood pressure observation with component systolic/diastolic.',
  category: 'valid',
  tags: ['vital-signs', 'component'],
  json: JSON.stringify({
    resourceType: 'Observation',
    id: 'blood-pressure-obs',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' }] },
    subject: { reference: 'Patient/example-patient' },
    effectiveDateTime: '2024-01-15T10:00:00Z',
    component: [
      { code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }] }, valueQuantity: { value: 120, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' } },
      { code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }] }, valueQuantity: { value: 80, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' } },
    ],
  }, null, 2),
};

const OBS_VALID_TEMPERATURE: ExampleEntry = {
  id: 'observation-temperature',
  resourceType: 'Observation',
  title: 'Observation – Body Temperature',
  description: 'Body temperature vital sign observation.',
  category: 'valid',
  tags: ['vital-signs'],
  json: JSON.stringify({
    resourceType: 'Observation',
    id: 'temperature-obs',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '8310-5', display: 'Body temperature' }], text: 'Body temperature' },
    subject: { reference: 'Patient/example-patient' },
    effectiveDateTime: '2024-01-15T10:00:00Z',
    valueQuantity: { value: 36.8, unit: 'C', system: 'http://unitsofmeasure.org', code: 'Cel' },
  }, null, 2),
};

const OBS_VALID_LAB: ExampleEntry = {
  id: 'observation-lab-result',
  resourceType: 'Observation',
  title: 'Observation – Lab Result (Glucose)',
  description: 'Laboratory observation for blood glucose.',
  category: 'valid',
  tags: ['laboratory'],
  json: JSON.stringify({
    resourceType: 'Observation',
    id: 'glucose-lab',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '2339-0', display: 'Glucose [Mass/volume] in Blood' }] },
    subject: { reference: 'Patient/example-patient' },
    effectiveDateTime: '2024-01-15T08:00:00Z',
    valueQuantity: { value: 95, unit: 'mg/dL', system: 'http://unitsofmeasure.org', code: 'mg/dL' },
    referenceRange: [{ low: { value: 70, unit: 'mg/dL' }, high: { value: 100, unit: 'mg/dL' } }],
  }, null, 2),
};

const OBS_VALID_BMI: ExampleEntry = {
  id: 'observation-bmi',
  resourceType: 'Observation',
  title: 'Observation – BMI',
  description: 'Body Mass Index observation.',
  category: 'valid',
  tags: ['vital-signs'],
  json: JSON.stringify({
    resourceType: 'Observation',
    id: 'bmi-obs',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '39156-5', display: 'Body mass index (BMI)' }] },
    subject: { reference: 'Patient/example-patient' },
    effectiveDateTime: '2024-01-15T10:00:00Z',
    valueQuantity: { value: 24.5, unit: 'kg/m2', system: 'http://unitsofmeasure.org', code: 'kg/m2' },
  }, null, 2),
};

const OBS_ERROR_MISSING_STATUS: ExampleEntry = {
  id: 'observation-error-missing-status',
  resourceType: 'Observation',
  title: 'Observation Error – Missing Status',
  description: 'Observation missing the required "status" field.',
  category: 'error',
  tags: ['error', 'missing-required'],
  json: JSON.stringify({
    resourceType: 'Observation',
    id: 'missing-status',
    code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
    subject: { reference: 'Patient/example-patient' },
    valueQuantity: { value: 72, unit: 'beats/minute' },
  }, null, 2),
};

const OBS_ERROR_WRONG_VALUE: ExampleEntry = {
  id: 'observation-error-wrong-value',
  resourceType: 'Observation',
  title: 'Observation Error – Wrong Value Type',
  description: 'Observation with wrong data type for valueQuantity.',
  category: 'error',
  tags: ['error', 'type-mismatch'],
  json: JSON.stringify({
    resourceType: 'Observation',
    id: 'wrong-value-type',
    status: 'final',
    code: { text: 'Heart rate' },
    valueQuantity: 'not-a-quantity',
  }, null, 2),
};

// ── Encounter Examples ───────────────────────

const ENCOUNTER_VALID_AMBULATORY: ExampleEntry = {
  id: 'encounter-ambulatory',
  resourceType: 'Encounter',
  title: 'Encounter – Ambulatory',
  description: 'Ambulatory encounter with type and period.',
  category: 'valid',
  tags: ['ambulatory'],
  json: JSON.stringify({
    resourceType: 'Encounter',
    id: 'ambulatory-encounter',
    status: 'finished',
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
    type: [{ coding: [{ system: 'http://snomed.info/sct', code: '270427003', display: 'Patient-initiated encounter' }] }],
    subject: { reference: 'Patient/example-patient' },
    period: { start: '2024-01-15T09:00:00Z', end: '2024-01-15T10:30:00Z' },
  }, null, 2),
};

const ENCOUNTER_VALID_INPATIENT: ExampleEntry = {
  id: 'encounter-inpatient',
  resourceType: 'Encounter',
  title: 'Encounter – Inpatient',
  description: 'Inpatient encounter with hospitalization details.',
  category: 'valid',
  tags: ['inpatient'],
  json: JSON.stringify({
    resourceType: 'Encounter',
    id: 'inpatient-encounter',
    status: 'in-progress',
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'IMP', display: 'inpatient encounter' },
    subject: { reference: 'Patient/example-patient' },
    period: { start: '2024-01-10T14:00:00Z' },
    hospitalization: {
      admitSource: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/admit-source', code: 'emd', display: 'From accident/emergency department' }] },
    },
  }, null, 2),
};

const ENCOUNTER_ERROR_MISSING_STATUS: ExampleEntry = {
  id: 'encounter-error-missing-status',
  resourceType: 'Encounter',
  title: 'Encounter Error – Missing Status & Class',
  description: 'Encounter missing required "status" and "class" fields.',
  category: 'error',
  tags: ['error', 'missing-required'],
  json: JSON.stringify({
    resourceType: 'Encounter',
    id: 'missing-required',
    subject: { reference: 'Patient/example-patient' },
    period: { start: '2024-01-15T09:00:00Z' },
  }, null, 2),
};

// ── Condition Examples ───────────────────────

const CONDITION_VALID_DIABETES: ExampleEntry = {
  id: 'condition-diabetes',
  resourceType: 'Condition',
  title: 'Condition – Diabetes Type 2',
  description: 'Active diabetes mellitus type 2 condition.',
  category: 'valid',
  tags: ['chronic'],
  json: JSON.stringify({
    resourceType: 'Condition',
    id: 'diabetes-condition',
    clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
    verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }] },
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis' }] }],
    code: { coding: [{ system: 'http://snomed.info/sct', code: '44054006', display: 'Diabetes mellitus type 2' }] },
    subject: { reference: 'Patient/example-patient' },
    onsetDateTime: '2020-03-15',
  }, null, 2),
};

const CONDITION_ERROR_MISSING_CODE: ExampleEntry = {
  id: 'condition-error-missing-code',
  resourceType: 'Condition',
  title: 'Condition Error – Missing Code',
  description: 'Condition without a code (which is important but not strictly required in base R4).',
  category: 'error',
  tags: ['error', 'missing-field'],
  json: JSON.stringify({
    resourceType: 'Condition',
    id: 'no-code-condition',
    subject: { reference: 'Patient/example-patient' },
    onsetDateTime: '2020-01-01',
  }, null, 2),
};

// ── Procedure Examples ───────────────────────

const PROCEDURE_VALID: ExampleEntry = {
  id: 'procedure-appendectomy',
  resourceType: 'Procedure',
  title: 'Procedure – Appendectomy',
  description: 'Completed appendectomy surgical procedure.',
  category: 'valid',
  tags: ['surgery'],
  json: JSON.stringify({
    resourceType: 'Procedure',
    id: 'appendectomy',
    status: 'completed',
    code: { coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }] },
    subject: { reference: 'Patient/example-patient' },
    performedDateTime: '2024-01-10T08:00:00Z',
  }, null, 2),
};

// ── MedicationRequest Examples ───────────────

const MEDRQ_VALID: ExampleEntry = {
  id: 'medicationrequest-metformin',
  resourceType: 'MedicationRequest',
  title: 'MedicationRequest – Metformin',
  description: 'Active metformin prescription for diabetes management.',
  category: 'valid',
  tags: ['prescription'],
  json: JSON.stringify({
    resourceType: 'MedicationRequest',
    id: 'metformin-rx',
    status: 'active',
    intent: 'order',
    medicationCodeableConcept: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '860975', display: 'Metformin 500 MG Oral Tablet' }] },
    subject: { reference: 'Patient/example-patient' },
    authoredOn: '2024-01-15',
    dosageInstruction: [{ text: 'Take 500mg twice daily with meals', timing: { repeat: { frequency: 2, period: 1, periodUnit: 'd' } } }],
  }, null, 2),
};

const MEDRQ_ERROR: ExampleEntry = {
  id: 'medicationrequest-error-missing-intent',
  resourceType: 'MedicationRequest',
  title: 'MedicationRequest Error – Missing Intent',
  description: 'MedicationRequest missing the required "intent" field.',
  category: 'error',
  tags: ['error', 'missing-required'],
  json: JSON.stringify({
    resourceType: 'MedicationRequest',
    id: 'missing-intent',
    status: 'active',
    medicationCodeableConcept: { text: 'Aspirin' },
    subject: { reference: 'Patient/example-patient' },
  }, null, 2),
};

// ── Bundle Example ───────────────────────────

const BUNDLE_VALID: ExampleEntry = {
  id: 'bundle-patient-observation',
  resourceType: 'Bundle',
  title: 'Bundle – Patient + Observation',
  description: 'Transaction bundle containing a Patient and an Observation.',
  category: 'valid',
  tags: ['transaction', 'bundle'],
  json: JSON.stringify({
    resourceType: 'Bundle',
    id: 'transaction-bundle',
    type: 'transaction',
    entry: [
      {
        fullUrl: 'urn:uuid:patient-1',
        resource: { resourceType: 'Patient', id: 'patient-1', name: [{ family: 'Doe', given: ['John'] }] },
        request: { method: 'POST', url: 'Patient' },
      },
      {
        fullUrl: 'urn:uuid:obs-1',
        resource: {
          resourceType: 'Observation', id: 'obs-1', status: 'final',
          code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
          subject: { reference: 'urn:uuid:patient-1' },
          valueQuantity: { value: 72, unit: '/min' },
        },
        request: { method: 'POST', url: 'Observation' },
      },
    ],
  }, null, 2),
};

// ── Full Library ─────────────────────────────

export const EXAMPLE_LIBRARY: ExampleEntry[] = [
  // Patient
  PATIENT_VALID_BASIC,
  PATIENT_VALID_MINIMAL,
  PATIENT_VALID_CONTACT,
  PATIENT_VALID_MULTI_ID,
  PATIENT_VALID_DECEASED,
  PATIENT_ERROR_INVALID_GENDER,
  PATIENT_ERROR_WRONG_TYPE,
  // Observation
  OBS_VALID_HEART_RATE,
  OBS_VALID_BLOOD_PRESSURE,
  OBS_VALID_TEMPERATURE,
  OBS_VALID_LAB,
  OBS_VALID_BMI,
  OBS_ERROR_MISSING_STATUS,
  OBS_ERROR_WRONG_VALUE,
  // Encounter
  ENCOUNTER_VALID_AMBULATORY,
  ENCOUNTER_VALID_INPATIENT,
  ENCOUNTER_ERROR_MISSING_STATUS,
  // Condition
  CONDITION_VALID_DIABETES,
  CONDITION_ERROR_MISSING_CODE,
  // Procedure
  PROCEDURE_VALID,
  // MedicationRequest
  MEDRQ_VALID,
  MEDRQ_ERROR,
  // Bundle
  BUNDLE_VALID,
];

// ── Query Helpers ────────────────────────────

/** Get all examples for a specific resource type. */
export function getExamplesForType(resourceType: string): ExampleEntry[] {
  return EXAMPLE_LIBRARY.filter((e) => e.resourceType === resourceType);
}

/** Get all resource types that have examples. */
export function getExampleResourceTypes(): string[] {
  return [...new Set(EXAMPLE_LIBRARY.map((e) => e.resourceType))].sort();
}

/** Get examples by category. */
export function getExamplesByCategory(category: ExampleCategory): ExampleEntry[] {
  return EXAMPLE_LIBRARY.filter((e) => e.category === category);
}

/** Search examples by title or description. */
export function searchExamples(query: string): ExampleEntry[] {
  const lower = query.toLowerCase();
  return EXAMPLE_LIBRARY.filter(
    (e) => e.title.toLowerCase().includes(lower) || e.description.toLowerCase().includes(lower) || e.tags.some((t) => t.includes(lower)),
  );
}

/** Get a single example by id. */
export function getExampleById(id: string): ExampleEntry | undefined {
  return EXAMPLE_LIBRARY.find((e) => e.id === id);
}
