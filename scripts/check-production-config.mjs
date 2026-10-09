import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';

const workflows = readdirSync('.github/workflows').filter((name) => /\.ya?ml$/.test(name));
assert.deepEqual(workflows, ['deploy-production.yml'], 'Only one workflow is allowed');
const workflow = parse(readFileSync('.github/workflows/deploy-production.yml', 'utf8'));
const compose = parse(readFileSync('docker-compose.production.yml', 'utf8'));
assert.equal(workflow.concurrency['cancel-in-progress'], false, 'Do not cancel production migrations');
assert.equal(workflow.jobs['build-backend'].needs, undefined);
assert.equal(workflow.jobs['build-frontend'].needs, undefined);
assert(workflow.jobs.integration.needs.includes('validate'));
assert(workflow.jobs.deploy.needs.includes('integration'));
for (const [name, service] of Object.entries(compose.services)) {
  assert.equal(service.build, undefined, `${name}: production must not build`);
  assert.equal(service.logging.options['max-size'], '10m');
  assert.equal(service.logging.options['max-file'], '3');
}
assert.deepEqual(compose.services.web.ports, ['127.0.0.1:3190:80']);
assert.equal(compose.services.api.ports, undefined);
assert.equal(compose.services.postgres.ports, undefined);
assert.deepEqual(compose.services.migrator.profiles, ['tools']);
for (const [name, volume] of Object.entries(compose.volumes)) {
  assert.equal(volume.name, name);
  assert.equal(volume.external, true, 'External persistent volumes must survive compose down');
}
assert.deepEqual(parse(readFileSync('docker-compose.vps.yml', 'utf8')).include, ['docker-compose.production.yml']);
const deploy = readFileSync('scripts/deploy-production.sh', 'utf8');
assert(!/docker (?:system|volume|image) prune|compose\s+build\b/.test(deploy));
assert(!deploy.includes('--accept-data-loss'));
assert(deploy.includes('pg_dump'));
assert(deploy.includes('pg_restore --list'));
assert(deploy.includes('rollback_on_error'));
console.log('Workflow, parallel builds, deployment gate, persistence and log settings checked.');
