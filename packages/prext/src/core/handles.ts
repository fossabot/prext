import url from 'url';
import { IncomingMessage, ServerResponse } from 'http';
import { pathToRegexp } from '@osik/path-regexp';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { CACHE_DIRECTORY } from '../constants';
import { ObjectkeysMap } from '../../lib/chageKeys';
import { error } from '../logger';
import { Config } from '../config';

export function handles(
  req: IncomingMessage,
  res: ServerResponse,
  routes: {
    file: string;
    m: any;
    modulePath: string;
    type: string;
  }[],
  config: Config
) {
  const parsed = url.parse(req.url);

  // @ts-ignore
  res.json = function (data: any) {
    res.end(JSON.stringify(data));
  };

  if (parsed.pathname.startsWith('/.prext/')) {
    const target = join(CACHE_DIRECTORY, '../', parsed.pathname);

    if (existsSync(target)) {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(readFileSync(target));
    } else {
      res.statusCode = 404;
      res.end(`Cannot read ${target}`);
    }
  }

  // is sended
  let isSended = false;

  routes.forEach((page) => {
    // debug
    // console.log(page.file, isSended);

    if (isSended) {
      return;
    }

    const { pattern, params } = pathToRegexp(page.file, false);

    // matched page

    if (pattern.test(parsed.pathname)) {
      if (page.type === 'html') {
        // html

        isSended = true;

        res.setHeader('Content-Type', 'text/html');
        res.end(page.m);
      } else {
        // module

        page.m = ObjectkeysMap(page.m, (key) => key.toLowerCase());

        // check method

        Object.keys(page.m).forEach(async (pageHandler) => {
          // "all"
          if (pageHandler === req.method.toLowerCase() || pageHandler === 'all') {
            isSended = true;

            const execd = new URL(req.url, `http://${req.headers.host}`).pathname.match(
              pattern
            );

            // assign parameters.

            if (!req.params) req.params = {};

            params.forEach((param, index) => {
              req.params[param] = execd[index + 1] || null;
            });

            try {
              const target = page.m;
              const $page = page.m.$page || {};

              if ($page.before) await $page.before(req, res);

              await target[pageHandler](req, res);

              if ($page.after) await $page.after(req, res);
            } catch (e) {
              error(new Error(e));
            }
          }
        });
      }
    }
  });

  // 404
  if (!isSended && res.writable) {
    if (config.error) config.error(req, res);
    else res.statusCode = 404;
  }
}
