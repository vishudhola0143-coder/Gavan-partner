// Vercel serverless entry (demo hosting). Data lives in /tmp and may reset.
process.env.DATA_DIR = process.env.DATA_DIR || '/tmp/gavan-data';
const { app, boot } = require('../server/index');
boot();
module.exports = app;
