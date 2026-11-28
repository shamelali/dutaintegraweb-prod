import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readConfig(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function indentOf(line) {
  return line.match(/^ */)[0].length;
}

function isContent(line) {
  const trimmed = line.trim();
  return trimmed !== "" && !trimmed.startsWith("#");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Extract one mapping block without requiring a YAML dependency. */
function mappingBlock(source, key, indent) {
  const lines = source.split("\n");
  const heading = new RegExp(`^ {${indent}}${escapeRegExp(key)}:\\s*(?:#.*)?$`);
  const starts = lines.flatMap((line, index) => heading.test(line) ? [index] : []);
  assert.equal(starts.length, 1, `Expected one ${key}: mapping at indentation ${indent}`);

  const block = [];
  for (let index = starts[0] + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (isContent(line) && indentOf(line) <= indent) break;
    block.push(line);
  }
  return block.join("\n");
}

function mappingValue(source, key, indent) {
  const pattern = new RegExp(`^ {${indent}}${escapeRegExp(key)}:\\s*(.*?)\\s*$`);
  const values = source.split("\n")
    .filter((line) => isContent(line) && indentOf(line) === indent)
    .flatMap((line) => {
      const match = line.match(pattern);
      return match ? [match[1].replace(/\s+#.*$/, "").trim()] : [];
    });
  assert.equal(values.length, 1, `Expected one ${key}: value at indentation ${indent}`);
  return values[0];
}

function inlineList(value) {
  assert.match(value, /^\[.*\]$/, `Expected an inline YAML list, got ${value}`);
  return value.slice(1, -1).split(",")
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

function gitHubJobNeeds(job) {
  const value = mappingValue(job, "needs", 4);
  if (value.startsWith("[")) return inlineList(value);
  if (/^[\w-]+$/.test(value)) return [value];
  return mappingBlock(job, "needs", 4).split("\n")
    .filter((line) => isContent(line))
    .map((line) => {
      const match = line.trim().match(/^-\s+([\w-]+)$/);
      assert.ok(match, `Unsupported GitHub needs entry: ${line.trim()}`);
      return match[1];
    });
}

function gitLabJobNeeds(job) {
  const value = mappingValue(job, "needs", 2);
  if (value) return inlineList(value).map((name) => ({ job: name, artifacts: false }));

  const entries = [];
  for (const line of mappingBlock(job, "needs", 2).split("\n")) {
    if (!isContent(line)) continue;
    const trimmed = line.trim();
    const item = trimmed.match(/^-\s+(?:job:\s*)?([\w-]+)$/);
    if (item) {
      entries.push({ job: item[1], artifacts: false });
      continue;
    }
    const artifacts = trimmed.match(/^artifacts:\s*(true|false)$/);
    assert.ok(artifacts && entries.length, `Unsupported GitLab needs entry: ${trimmed}`);
    entries.at(-1).artifacts = artifacts[1] === "true";
  }
  return entries;
}

function directMappingKeys(source, indent) {
  const keys = new Set();
  for (const line of source.split("\n")) {
    if (!isContent(line) || indentOf(line) !== indent) continue;
    const match = line.trim().match(/^([\w-]+):(?:\s|$)/);
    if (match) keys.add(match[1]);
  }
  return keys;
}

function gitHubJob(config, name) {
  return mappingBlock(mappingBlock(config, "jobs", 0), name, 2);
}

/** Split the direct step list while retaining each step's nested mapping. */
function gitHubSteps(job) {
  const steps = [];
  let current;
  for (const line of mappingBlock(job, "steps", 4).split("\n")) {
    if (isContent(line) && indentOf(line) === 6 && line.trim().startsWith("- ")) {
      current = [];
      steps.push(current);
    }
    if (current) current.push(line);
  }
  return steps.map((lines) => lines.join("\n"));
}

function optionalMappingValue(source, key, indent) {
  const pattern = new RegExp(`^ {${indent}}${escapeRegExp(key)}:\\s*(.*?)\\s*$`);
  const value = source.split("\n")
    .filter((line) => isContent(line) && indentOf(line) === indent)
    .flatMap((line) => {
      const match = line.match(pattern);
      return match ? [match[1].replace(/\s+#.*$/, "").trim()] : [];
    });
  assert.ok(value.length <= 1, `Expected at most one ${key}: value at indentation ${indent}`);
  return value[0] ?? null;
}

/** Only direct step keys count; `if:` inside run/env/with is data, not a gate. */
function gitHubStepDirectEntries(step) {
  const entries = new Map();
  for (const line of step.split("\n")) {
    const first = line.match(/^ {6}-\s+([\w-]+):\s*(.*?)\s*$/);
    const direct = line.match(/^ {8}([\w-]+):\s*(.*?)\s*$/);
    const match = first ?? direct;
    if (match) entries.set(match[1], match[2].replace(/\s+#.*$/, "").trim());
  }
  return entries;
}

function gitHubJobGateProblems(job, { requireUnconditionalSteps = false } = {}) {
  const problems = [];
  const condition = optionalMappingValue(job, "if", 4);
  if (condition && /\b(?:always|failure|cancelled)\s*\(/i.test(condition)) {
    problems.push(`job condition ${condition} uses a status override that can run after failed needs`);
  }

  for (const step of gitHubSteps(job)) {
    const entries = gitHubStepDirectEntries(step);
    const name = entries.get("name") ?? entries.get("uses") ?? stepRun(step) ?? "unnamed step";
    const continuing = entries.get("continue-on-error");
    if (continuing !== undefined && !/^(?:false|no|off)$/i.test(continuing.replace(/^['"]|['"]$/g, ""))) {
      problems.push(`${name}: direct continue-on-error must be false`);
    }
    problems.push(...gitHubDeploymentStepConditionProblems(step));
    if (requireUnconditionalSteps && entries.has("if")) {
      problems.push(`${name}: required verify step must not have a direct if condition`);
    }
  }
  return problems;
}

function stepValue(step, key) {
  const pattern = new RegExp(`^\\s*(?:-\\s+)?${escapeRegExp(key)}:\\s*(.*?)\\s*$`, "m");
  const value = step.match(pattern)?.[1] ?? "";
  return value.replace(/\s+#.*$/, "").trim();
}

function stepRun(step) {
  const lines = step.split("\n");
  const index = lines.findIndex((line) => /^\s*(?:-\s+)?run:\s*/.test(line));
  if (index < 0) return "";
  const inline = lines[index].match(/^\s*(?:-\s+)?run:\s*(.*?)\s*$/)[1];
  if (inline && !/^[|>][+-]?$/.test(inline)) return inline.replace(/\s+#.*$/, "").trim();

  const baseIndent = indentOf(lines[index]);
  const body = [];
  for (const line of lines.slice(index + 1)) {
    if (isContent(line) && indentOf(line) <= baseIndent) break;
    body.push(line);
  }
  const content = body.filter((line) => line.trim() && !line.trim().startsWith("#"));
  if (content.length === 0) return "";
  const contentIndent = Math.min(...content.map(indentOf));
  return body.map((line) => (line.trim() ? line.slice(contentIndent) : "")).join("\n").trim();
}

const CLOUDFLARE_TOKEN_STEP_CONDITION = "${{ env.CLOUDFLARE_API_TOKEN != '' }}";

/** Deployment and production verification may only be skipped for a missing token. */
function gitHubDeploymentStepConditionProblems(step) {
  const command = stepRun(step);
  const isDeploymentStep = command.includes("wrangler pages deploy public")
    || command === "node scripts/verify-deploy.mjs";
  if (!isDeploymentStep) return [];

  const entries = gitHubStepDirectEntries(step);
  const condition = entries.get("if");
  if (condition === undefined || condition === CLOUDFLARE_TOKEN_STEP_CONDITION) return [];
  const name = entries.get("name") ?? command;
  return [`${name}: deployment step condition must be absent or exactly ${CLOUDFLARE_TOKEN_STEP_CONDITION}`];
}

function artifactValue(step, key) {
  return step.match(new RegExp(`^\\s+${escapeRegExp(key)}:\\s*(.*?)\\s*$`, "m"))?.[1]
    .replace(/\s+#.*$/, "").trim();
}

const MANUAL_VERIFY_COMMANDS = [
  "npm test",
  "PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s automations/uptime-watch -p 'test_*.py' -v",
  "npm run validate:env",
  "npm --prefix web-new ci",
  "npm --prefix web-new run test",
  "npm --prefix web-new run lint",
  "npm run build:web",
  "node scripts/scan-secrets.mjs --verify",
  "node scripts/scan-secrets.mjs --history --verify",
];

function gitHubFixtureJob(name, body) {
  const jobs = mappingBlock(`jobs:\n  ${name}:\n${body}`, "jobs", 0);
  return mappingBlock(jobs, name, 2);
}

test("GitLab deploy-pages waits for every mandatory verification gate", () => {
  const job = mappingBlock(readConfig(".gitlab-ci.yml"), "deploy-pages", 0);
  const needs = gitLabJobNeeds(job);
  const required = ["server-tests", "frontend-tests", "env-docs", "secret-scan", "artifact-drift"];

  for (const name of required) {
    assert.ok(needs.some((entry) => entry.job === name), `GitLab deploy-pages is missing needs: ${name}`);
  }
  const artifactDrift = needs.find((entry) => entry.job === "artifact-drift");
  assert.equal(artifactDrift.artifacts, true, "GitLab deploy-pages must download artifact-drift artifacts");
});

test("GitHub deploy-pages waits for every mandatory verification gate", () => {
  const jobs = mappingBlock(readConfig(".github/workflows/ci.yml"), "jobs", 0);
  const job = mappingBlock(jobs, "deploy-pages", 2);
  const needs = gitHubJobNeeds(job);
  const required = ["test", "env-docs", "frontend", "secret-scan", "artifact-drift"];

  for (const name of required) {
    assert.ok(needs.includes(name), `GitHub deploy-pages is missing needs: ${name}`);
  }
});

test("manual Pages companion has only a workflow_dispatch trigger", () => {
  const triggers = directMappingKeys(mappingBlock(readConfig(".github/workflows/pages-deploy.yml"), "on", 0), 2);
  assert.deepEqual([...triggers], ["workflow_dispatch"], "Pages companion must only support deliberate manual dispatch");
});

test("manual Pages verify runs every mandatory gate and scans full history", () => {
  const verify = gitHubJob(readConfig(".github/workflows/pages-deploy.yml"), "verify");
  const steps = gitHubSteps(verify);
  const commands = steps.map(stepRun).filter(Boolean);
  for (const command of MANUAL_VERIFY_COMMANDS) {
    assert.ok(commands.includes(command), `Pages companion verify is missing: ${command}`);
  }
  assert.match(commands.join("\n"), /git status --porcelain -- Web\/ public\//,
    "Pages companion verify must fail on drift in either deploy tree");

  const checkoutIndex = steps.findIndex((step) => stepValue(step, "uses") === "actions/checkout@v4");
  const historyScanIndex = steps.findIndex((step) => stepRun(step) === "node scripts/scan-secrets.mjs --history --verify");
  assert.ok(checkoutIndex >= 0, "Pages companion verify must check out the repository");
  assert.match(steps[checkoutIndex], /^\s+fetch-depth:\s*0\s*$/m,
    "Pages companion checkout must include full history for the history scan");
  assert.ok(historyScanIndex > checkoutIndex, "Pages companion must scan history after a full checkout");

  const upload = steps.find((step) => stepValue(step, "uses") === "actions/upload-artifact@v4");
  assert.ok(upload, "Pages companion verify must upload its verified public/ artifact");
  assert.equal(artifactValue(upload, "name"), "pages-deploy-public");
  assert.equal(artifactValue(upload, "path"), "public");
});

test("manual Pages deploy uses the verified artifact and verifies production", () => {
  const config = readConfig(".github/workflows/pages-deploy.yml");
  const verify = gitHubJob(config, "verify");
  const deploy = gitHubJob(config, "deploy");
  assert.deepEqual(gitHubJobNeeds(deploy), ["verify"], "manual deploy must wait for verify");
  assert.match(deploy, /^\s+if:.*github\.ref == 'refs\/heads\/main'.*vars\.CF_PAGES_DEPLOY_ENABLED == 'true'/m,
    "manual deploy must retain its main-branch and CF_PAGES_DEPLOY_ENABLED gates");

  const verifySteps = gitHubSteps(verify);
  const upload = verifySteps.find((step) => stepValue(step, "uses") === "actions/upload-artifact@v4");
  assert.ok(upload, "verify must produce the deploy artifact");
  const artifactName = artifactValue(upload, "name");

  const steps = gitHubSteps(deploy);
  const checkoutIndex = steps.findIndex((step) => stepValue(step, "uses") === "actions/checkout@v4");
  const downloadIndex = steps.findIndex((step) => stepValue(step, "uses") === "actions/download-artifact@v4");
  assert.ok(checkoutIndex >= 0, "deploy must check out scripts/verify-deploy.mjs");
  assert.ok(downloadIndex > checkoutIndex, "deploy must check out verification scripts before downloading public/");
  assert.equal(artifactValue(steps[downloadIndex], "name"), artifactName,
    "deploy must download the same pages-deploy-public artifact verify uploaded");
  assert.equal(artifactValue(steps[downloadIndex], "path"), "public");

  const deployIndex = steps.findIndex((step) => stepRun(step).includes("wrangler pages deploy public"));
  const productionVerifyIndex = steps.findIndex((step) => stepRun(step) === "node scripts/verify-deploy.mjs");
  assert.ok(deployIndex > downloadIndex, "deploy must upload the downloaded verified artifact");
  assert.ok(productionVerifyIndex > deployIndex, "production verification must run after the deploy command");
  const command = stepRun(steps[deployIndex]);
  assert.match(command, /--project-name=dutaintegra/);
  assert.match(command, /--branch\s+main\b/, "deploy must explicitly target the production branch");
  assert.match(command, /--commit-hash\s+"\$COMMIT_SHA"/, "deploy must record the dispatched commit SHA");
  assert.match(command, /--commit-message\s+"GitHub Actions \$RUN_URL"/,
    "deploy must retain the GitHub Actions provenance message");
  assert.match(steps[deployIndex], /^\s+COMMIT_SHA:\s*\$\{\{ github\.sha \}\}\s*$/m);
  assert.match(steps[deployIndex], /^\s+RUN_URL:.*github\.run_id/m);
});

const DEPLOY_GATE_CONFIGS = [
  ["GitHub primary deploy", ".github/workflows/ci.yml", "deploy-pages", 2],
  ["GitHub manual verify", ".github/workflows/pages-deploy.yml", "verify", 2],
  ["GitHub manual deploy", ".github/workflows/pages-deploy.yml", "deploy", 2],
  ["GitLab deploy", ".gitlab-ci.yml", "deploy-pages", 0],
  ["GitLab production verification", ".gitlab-ci.yml", "verify-deploy", 0],
];

for (const [name, path, jobName, indent] of DEPLOY_GATE_CONFIGS) {
  test(`${name} cannot bypass a failed gate`, () => {
    const source = readConfig(path);
    const jobs = path.endsWith(".yml") && path.startsWith(".github/")
      ? mappingBlock(source, "jobs", 0)
      : source;
    const job = mappingBlock(jobs, jobName, indent);
    assert.doesNotMatch(job, /^\s*allow_failure:\s*(?:true|yes|on)\s*(?:#.*)?$/im);
    assert.doesNotMatch(job, /^\s*continue-on-error:\s*(?:true|yes|on)\s*(?:#.*)?$/im);
    assert.doesNotMatch(job, /^\s*when:\s*always\s*(?:#.*)?$/im);
    assert.doesNotMatch(job, /^\s*if:.*\balways\s*\(/im);
  });
}

test("checked-in GitHub deploy and manual verify steps have no direct gate overrides", () => {
  for (const [path, jobName, requireUnconditional] of [
    [".github/workflows/ci.yml", "deploy-pages", false],
    [".github/workflows/pages-deploy.yml", "verify", true],
    [".github/workflows/pages-deploy.yml", "deploy", false],
  ]) {
    const job = gitHubJob(readConfig(path), jobName);
    assert.deepEqual(
      gitHubJobGateProblems(job, { requireUnconditionalSteps: requireUnconditional }),
      [],
      `${path} ${jobName} has a direct step or status override`,
    );
  }
});

test("GitHub mandatory verify detector rejects a direct if on a required step", () => {
  const job = gitHubFixtureJob("verify", `    steps:
      - name: Run server tests
        if: false
        run: npm test
`);
  const problems = gitHubJobGateProblems(job, { requireUnconditionalSteps: true });
  assert.ok(problems.some((problem) => /required verify step.*\bif\b/i.test(problem)), problems.join("; "));
});

for (const jobName of ["verify", "deploy"]) {
  test(`GitHub ${jobName} detector rejects a direct continue-on-error step`, () => {
    const job = gitHubFixtureJob(jobName, `    steps:
      - name: Mandatory command
        continue-on-error: true
        run: npm test
`);
    const problems = gitHubJobGateProblems(job, { requireUnconditionalSteps: jobName === "verify" });
    assert.ok(problems.some((problem) => /continue-on-error/i.test(problem)), problems.join("; "));
  });
}

test("GitHub mandatory verify detector ignores if text inside a run script", () => {
  const job = gitHubFixtureJob("verify", `    steps:
      - name: Drift check
        run: |
          if [ -n "$(git status --porcelain -- Web/ public/)" ]; then
            exit 1
          fi
`);
  assert.deepEqual(gitHubJobGateProblems(job, { requireUnconditionalSteps: true }), []);
});

for (const condition of ["always()", "!cancelled()", "failure()", "cancelled()"]) {
  test(`GitHub deploy detector rejects the ${condition} status override`, () => {
    const job = gitHubFixtureJob("deploy", `    needs: verify
    if: \${{ ${condition} }}
    steps:
      - run: wrangler pages deploy public
`);
    const problems = gitHubJobGateProblems(job);
    assert.ok(problems.some((problem) => /job condition.*status override/i.test(problem)), problems.join("; "));
  });
}

const GITHUB_DEPLOYMENT_STEPS = [
  ["wrangler deploy", "Deploy to Cloudflare Pages", "wrangler pages deploy public --project-name=dutaintegra"],
  ["production verification", "Verify production serves this build", "node scripts/verify-deploy.mjs"],
];

function gitHubDeploymentStepFixture(name, command, condition) {
  const ifLine = condition === null ? "" : `        if: ${condition}\n`;
  return gitHubFixtureJob("deploy", `    steps:
      - name: ${name}
${ifLine}        run: ${command}
`);
}

for (const [kind, name, command] of GITHUB_DEPLOYMENT_STEPS) {
  for (const [description, condition] of [
    ["no condition", null],
    ["the exact token-presence condition", CLOUDFLARE_TOKEN_STEP_CONDITION],
  ]) {
    test(`GitHub ${kind} permits ${description}`, () => {
      const job = gitHubDeploymentStepFixture(name, command, condition);
      assert.deepEqual(gitHubJobGateProblems(job), []);
    });
  }

  for (const [description, condition] of [
    ["if: false", "false"],
    ["a status override", "${{ always() }}"],
    ["a compound condition", "${{ env.CLOUDFLARE_API_TOKEN != '' && github.ref == 'refs/heads/main' }}"],
  ]) {
    test(`GitHub ${kind} rejects ${description}`, () => {
      const job = gitHubDeploymentStepFixture(name, command, condition);
      const problems = gitHubJobGateProblems(job);
      assert.ok(problems.some((problem) => /deployment step condition/i.test(problem)), problems.join("; "));
    });
  }
}
