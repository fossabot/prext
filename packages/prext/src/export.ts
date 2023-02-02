import { build } from 'esbuild';
import { rmSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { Config, configDev } from './config';
import { CACHE_DIRECTORY, DEFAULT_CONFIG } from './constants';
import { filenameToRoute, getPages } from './core';
import { success } from './logger';

export function exportsCode(config: Config) {
  return {
    import:
      'var { handles } = require("prext/server");var { server } = require("sard.js");',
    init: 'var app = server();',
    listen: `app.listen(${config.port}, () => {console.log("Prext Server is running. " + "(localhost:${config.port})")});`,
  };
}

export async function exportServer(config: Config): Promise<void> {
  rmSync(CACHE_DIRECTORY, { recursive: true, force: true });
  console.log(`${'$'.gray} Exporting App.`.cyan);

  const start = performance.now();

  const out = join(CACHE_DIRECTORY, 'core.__build.js');
  const outDir = join(process.cwd(), config.base || '.', 'dist');
  const outFile = join(outDir, 'index.js');
  const pages = filenameToRoute(await getPages(config));

  const code = exportsCode(config);
  const pagesCode = {};

  const pagesJSONCode = [];

  // get bundled config file
  const configData = await configDev();

  if (!configData) {
    writeFileSync(
      join(CACHE_DIRECTORY, 'core.config.json'),
      JSON.stringify(DEFAULT_CONFIG)
    );
  }

  // import pages
  pages.forEach((page, index) => {
    if (page.type === 'html') {
      pagesCode[index] = `\`${page.m.replace(/`/g, '\\`')}\``;
    } else {
      pagesCode[index] = `require("./${join(
        '',
        relative(CACHE_DIRECTORY, page.modulePath)
      ).replace(/\\/g, '\\\\')}")`;
    }
  });

  pages.forEach((page, index) => {
    pagesJSONCode.push(`{file:"${page.file}",m:${pagesCode[index]},type:"${page.type}"}`);
  });

  writeFileSync(
    out,
    `const __userconfig = require("./${relative(CACHE_DIRECTORY, configData)}");
${code.import}
${code.init}
const prext_pages = [${pagesJSONCode.join(',')}];
(__userconfig.default.middlewares || []).forEach((middleware) => app.use(middleware));
app.all("*", (req,res) => {handles(req,res, prext_pages)});
${code.listen}`
  );

  success('success to create build file.');

  await build({
    entryPoints: [out],
    outfile: outFile,
    bundle: true,
    logLevel: 'error',
    platform: 'node',
    minify: true,
  });

  success('success to export app.');

  console.log(`${`\n  + ${out}`.green}`);
  console.log(
    `${`  + ${outFile}`.green}  ${'done in'.gray} ${
      (performance.now() - start).toFixed(2).bold
    } ms\n`
  );
}
