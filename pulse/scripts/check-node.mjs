// Match the supported engine before copying, installing or building.
export function checkNode(version = process.versions.node) {
  const parts = version.split('.');
  if (parts.length !== 3 || parts.some((part) => !/^\d+$/.test(part))) {
    throw new Error(`This starter requires Node ^22.22.2 || ^24.15.0 || >=26.0.0; current Node is ${version}. Select a compatible installed runtime for this terminal, then retry. Keep that PATH for install, dev and build.`);
  }

  const [major, minor, patch] = parts.map(Number);
  const supported =
    (major === 22 && (minor > 22 || (minor === 22 && patch >= 2))) ||
    (major === 24 && (minor > 15 || (minor === 15 && patch >= 0))) ||
    major >= 26;

  if (!supported) {
    throw new Error(`This starter requires Node ^22.22.2 || ^24.15.0 || >=26.0.0; current Node is ${version}. Select a compatible installed runtime for this terminal, then retry. Keep that PATH for install, dev and build.`);
  }
}
checkNode();
