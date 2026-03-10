// ── Example FHIR Resources for testing ────────

export const EXAMPLE_PATIENT = `{
  "resourceType": "Patient",
  "id": "example-patient",
  "meta": {
    "versionId": "1",
    "lastUpdated": "2024-01-15T10:30:00Z"
  },
  "text": {
    "status": "generated",
    "div": "<div xmlns=\\"http://www.w3.org/1999/xhtml\\">John Doe</div>"
  },
  "identifier": [
    {
      "system": "http://hospital.example.org/patients",
      "value": "12345"
    }
  ],
  "active": true,
  "name": [
    {
      "use": "official",
      "family": "Doe",
      "given": ["John", "Michael"]
    }
  ],
  "gender": "male",
  "birthDate": "1990-06-15",
  "address": [
    {
      "use": "home",
      "line": ["123 Main St"],
      "city": "Springfield",
      "state": "IL",
      "postalCode": "62704",
      "country": "US"
    }
  ],
  "telecom": [
    {
      "system": "phone",
      "value": "+1-555-0123",
      "use": "home"
    },
    {
      "system": "email",
      "value": "john.doe@example.com"
    }
  ]
}`;

export const EXAMPLE_OBSERVATION = `{
  "resourceType": "Observation",
  "id": "example-observation",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "vital-signs",
          "display": "Vital Signs"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "8867-4",
        "display": "Heart rate"
      }
    ],
    "text": "Heart rate"
  },
  "subject": {
    "reference": "Patient/example-patient"
  },
  "effectiveDateTime": "2024-01-15T10:00:00Z",
  "valueQuantity": {
    "value": 72,
    "unit": "beats/minute",
    "system": "http://unitsofmeasure.org",
    "code": "/min"
  }
}`;

export const EXAMPLE_ENCOUNTER = `{
  "resourceType": "Encounter",
  "id": "example-encounter",
  "status": "finished",
  "class": {
    "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    "code": "AMB",
    "display": "ambulatory"
  },
  "type": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "270427003",
          "display": "Patient-initiated encounter"
        }
      ]
    }
  ],
  "subject": {
    "reference": "Patient/example-patient"
  },
  "period": {
    "start": "2024-01-15T09:00:00Z",
    "end": "2024-01-15T10:30:00Z"
  }
}`;

export const EXAMPLE_INVALID_RESOURCE = `{
  "resourceType": "Patient",
  "id": "invalid-example",
  "active": "yes",
  "birthDate": "not-a-date",
  "gender": "unknown-value",
  "name": "not-an-array"
}`;

export interface ExampleEntry {
  label: string;
  description: string;
  json: string;
}

export const EXAMPLES: ExampleEntry[] = [
  { label: 'Patient', description: 'Valid Patient resource with demographics', json: EXAMPLE_PATIENT },
  { label: 'Observation', description: 'Heart rate vital sign observation', json: EXAMPLE_OBSERVATION },
  { label: 'Encounter', description: 'Ambulatory encounter example', json: EXAMPLE_ENCOUNTER },
  { label: 'Invalid Patient', description: 'Patient with intentional errors', json: EXAMPLE_INVALID_RESOURCE },
];

// ── FHIRPath expression examples ──────────────

export interface FHIRPathExample {
  label: string;
  expression: string;
  description: string;
}

export const FHIRPATH_EXAMPLES: FHIRPathExample[] = [
  { label: 'Given names', expression: 'Patient.name.given', description: 'Extract all given names' },
  { label: 'Family name', expression: 'Patient.name.family', description: 'Extract family name' },
  { label: 'Is active', expression: 'Patient.active', description: 'Get active status' },
  { label: 'Phone numbers', expression: "Patient.telecom.where(system='phone').value", description: 'Filter phone telecoms' },
  { label: 'Resource type', expression: 'resourceType', description: 'Get the resource type' },
  { label: 'Has email', expression: "Patient.telecom.where(system='email').exists()", description: 'Check if email exists' },
  { label: 'Name count', expression: 'Patient.name.count()', description: 'Count name entries' },
  { label: 'Obs value', expression: 'Observation.valueQuantity.value', description: 'Get observation value' },
];
