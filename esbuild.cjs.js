const esbuild = require('esbuild');
const defaultConfig = require('./esbuild.config.js');

function build() {
  console.log(`🚀 Building cjs bundle for package...`);
  esbuild
    .build({
      ...defaultConfig,
      format: 'cjs',
      outfile: 'dist-cjs/index.cjs',
    })
    .then(() => console.log('⚡ Done'))
    .catch(() => process.exit(1));
}

build();
