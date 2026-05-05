// n8n loads from `dist/` per the `n8n` field in package.json.
// This file exists only so `require('n8n-nodes-acrelens')` doesn't throw
// in environments that probe the package root before n8n's loader kicks in.
module.exports = {};
