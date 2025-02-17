import { WatchOptions } from 'chokidar';
import { BuildOptions } from 'esbuild';
import { Request, Response, OsikServer, ServerOptions } from 'osik';
import { FileData } from './core';
import { IncomingMessage, ServerResponse } from 'http';

export type Middleware = (req: Request, res: Response, next: any) => void;

export type HandlerType = (
  req: IncomingMessage,
  res: ServerResponse,
  routes: FileData[]
) => void;

export type PluginOutput = FileData | null | undefined | void;

export interface Plugin {
  name: string;
  transform?: (id: string, code: string) => PluginOutput | Promise<PluginOutput>;
  server?: (server: OsikServer) => void;
}

export type pureMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: any
) => void;

export interface Config {
  port?: number;
  routes?: string;
  middlewares?: Middleware[];
  base?: string;
  handler?: HandlerType;
  esbuild?: BuildOptions;
  plugins?: Plugin[];
  watch?: {
    enable: boolean;
    options?: WatchOptions;
  };
  build?: {};
  // https://github.com/do4ng/prext/issues/7
  // error handling
  error?(req: IncomingMessage, res: ServerResponse): void | Promise<void>;

  // auto middleware

  middlewareDirectory?: string;
  allowAutoMiddlewares?: boolean;

  // middleware mode

  server?: {
    middlewareMode?: boolean;

    // osik options
    osik?: ServerOptions;
  };
}

export function showListen(port: string | number): void;

export * from './config';
export * from './constants';
export * from './core';
export * from './server';
export * from './method';
export * from './dependencies';
