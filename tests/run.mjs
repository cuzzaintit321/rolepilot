import {execFileSync} from 'node:child_process';import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('.test-build',{recursive:true});writeFileSync('.test-build/package.json','{"type":"commonjs"}');
const prefix='src/';
execFileSync(process.execPath,['node_modules/typescript/bin/tsc','--outDir','.test-build','--rootDir','.', '--module','commonjs','--moduleResolution','node','--target','ES2022','--lib','ES2022,DOM','--skipLibCheck','--esModuleInterop','--strict',`${prefix}lib/domain.ts`,`${prefix}lib/csv.ts`,`${prefix}lib/client-store.ts`],{stdio:'inherit'});
execFileSync(process.execPath,['--test','tests/regression.cjs'],{stdio:'inherit',env:{...process.env,ACC_COMPILED_PREFIX:prefix}});
