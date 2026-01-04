/** @type {import('esbuild').BuildOptions} */
module.exports = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  packages: 'external',
  target: ['node20'],
  conditions: ['default'],
  treeShaking: true,
  sourcemap: false,
  platform: 'node',
};
