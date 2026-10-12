import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function inspect({ workflow = '', properties = '', manifests = '' }) {
  const errors = [];
  const requiredWorkflowFragments = [
    'KEYCLOAK_CLIENT_ID: ${{ secrets.KEYCLOAK_CLIENT_ID }}',
    'KEYCLOAK_CLIENT_SECRET: ${{ secrets.KEYCLOAK_CLIENT_SECRET }}',
    'KEYCLOAK_CLIENT_ID\n',
    'KEYCLOAK_CLIENT_SECRET\n',
    '--from-literal=KEYCLOAK_CLIENT_ID="$KEYCLOAK_CLIENT_ID"',
    '--from-literal=KEYCLOAK_CLIENT_SECRET="$KEYCLOAK_CLIENT_SECRET"'
  ];
  for (const fragment of requiredWorkflowFragments) {
    if (!workflow.includes(fragment)) {
      errors.push(`workflow is missing required fragment: ${fragment.trim()}`);
    }
  }

  if (/KEYCLOAK_ADMIN_CLIENT_(?:ID|SECRET)/.test(workflow)) {
    errors.push('workflow uses obsolete KEYCLOAK_ADMIN_CLIENT_* names');
  }
  if (/echo[^\n]*(KEYCLOAK_CLIENT_SECRET|DEV_KEYCLOAK_CLIENT_SECRET)/.test(workflow)) {
    errors.push('workflow may echo a Keycloak client secret');
  }

  if (!properties.includes('dicekeeper.keycloak.admin.client-id=${KEYCLOAK_CLIENT_ID:not-configured}')
      || !properties.includes('dicekeeper.keycloak.admin.client-secret=${KEYCLOAK_CLIENT_SECRET:not-configured}')) {
    errors.push('application properties do not use the deployed KEYCLOAK_CLIENT_* names');
  }
  if (/KEYCLOAK_ADMIN_CLIENT_(?:ID|SECRET)/.test(properties)) {
    errors.push('application properties use obsolete KEYCLOAK_ADMIN_CLIENT_* names');
  }
  for (const property of [
    'dicekeeper.account-deletion.enabled',
    'dicekeeper.account-deletion.marker-retention',
    'dicekeeper.keycloak.admin.connect-timeout',
    'dicekeeper.keycloak.admin.request-timeout'
  ]) {
    if (!properties.includes(property)) {
      errors.push(`application properties are missing ${property}`);
    }
  }

  for (const variable of ['KEYCLOAK_CLIENT_ID', 'KEYCLOAK_CLIENT_SECRET', 'ACCOUNT_DELETION_ENABLED']) {
    const reference = new RegExp(`name:\\s*${variable}[\\s\\S]{0,180}secretKeyRef:[\\s\\S]{0,120}key:\\s*${variable}`);
    if (!reference.test(manifests)) {
      errors.push(`manifests do not source ${variable} from a Secret key`);
    }
  }
  if (/name:\s*KEYCLOAK_CLIENT_SECRET\s*\n\s*value:\s*[^\n]+/.test(manifests)) {
    errors.push('manifest contains a literal Keycloak client secret');
  }
  if (/name:\s*KEYCLOAK_CLIENT_ID\s*\n\s*value:\s*(?!From)[^\n]+/.test(manifests)) {
    errors.push('manifest contains a literal Keycloak client identifier');
  }

  return errors;
}

const actual = {
  workflow: read('.github/workflows/deploy.yml'),
  properties: read('src/main/resources/application.properties'),
  manifests: `${read('k8s/deployment.yaml')}\n${read('k8s/dev/deployment.yaml')}`
};

const errors = inspect(actual);
if (errors.length) {
  errors.forEach(error => console.error(`account-deletion config: ${error}`));
  process.exit(1);
}

const fixtures = [
  ['missing client keys', { workflow: read('scripts/fixtures/account-deletion-missing-admin.yml') }],
  ['literal secret', { manifests: read('scripts/fixtures/account-deletion-literal-secret.yaml') }]
];
for (const [name, fixture] of fixtures) {
  if (inspect({ ...actual, ...fixture }).length === 0) {
    console.error(`account-deletion config: invalid fixture unexpectedly passed: ${name}`);
    process.exit(1);
  }
}

console.log('Validated account-deletion properties, manifests, workflow secret wiring, and negative fixtures.');
