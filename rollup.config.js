import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import copy from 'rollup-plugin-copy';

export default {
  entry: 'src/scripts/app.js',
  format: 'iife',
  dest: 'ui/scripts/app.js',
  moduleName: 'Totem',
  plugins: [
    resolve({
      jsnext: true,
      main: true,
      browser: true,
    }),
    commonjs(),
    babel({
      exclude: 'node_modules/**',
    }),
    replace({
      exclude: 'node_modules/**',
      ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
      API_KEY: process.env.API_KEY || '',
      AUTH_DOMAIN: process.env.AUTH_DOMAIN || '',
      DATABASE_URL: process.env.DATABASE_URL || '',
      PROJECT_ID: process.env.PROJECT_ID || '',
      STORAGE_BUCKET: process.env.STORAGE_BUCKET || '',
      MESSAGING_SENDER_ID: process.env.MESSAGING_SENDER_ID || ''
    }),
    copy({
      "index.html": "www/index.html",
      "libs": "www/libs",
      "ui": "www/ui",
      "res": "www/res",
    })
  ],
};