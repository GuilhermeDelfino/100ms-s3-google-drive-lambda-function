// build.mjs
import dotenv from 'dotenv';
import { build } from 'esbuild';

// Carrega o .env
const env = dotenv.config().parsed;

if (!env) {
    throw new Error('Arquivo .env não encontrado ou vazio');
}

// Converte para define
const define = {};
for (const k in env) {
    define[`process.env.${k}`] = JSON.stringify(env[k]);
}

// Executa o build
build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outdir: 'lambda-package',
    external: ['aws-sdk'],
    define,
}).catch(() => process.exit(1));
