import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';

const config = require('./config.json');

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
      API_KEY: config.API_KEY,
      AUTH_DOMAIN: config.AUTH_DOMAIN,
      DATABASE_URL: config.DATABASE_URL,
      PROJECT_ID: config.PROJECT_ID,
      STORAGE_BUCKET: config.STORAGE_BUCKET,
      MESSAGING_SENDER_ID: config.MESSAGING_SENDER_ID
    }),
  ],
};