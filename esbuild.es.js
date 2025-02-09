const esbuild = require('esbuild')
const defaultConfig = require('./esbuild.config.js')

function build() {
  console.log(`🚀 Building esm bundle for package...`);
  esbuild
    .build({
      ...defaultConfig,
      format: 'esm',
      outfile: 'dist-esm/index.js',
    })
    .then(() => console.log('⚡ Done'))
    .catch(() => process.exit(1));
}

build();

