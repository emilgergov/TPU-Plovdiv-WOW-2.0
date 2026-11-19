import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transform} from 'esbuild';
import {overlayModule} from '../src/kt126/gateway.mjs';
for(const rel of ['vt03/kt80/KT83_AI_SUBJECT_V572.js','vt03/kt80/KT83_AI_SCOPE_V572.js','vt03/kt80/integration/kt96-eg-ai-stage4-author.mjs','vt03/kt80/integration/kt117-stage5-document-author.mjs']){
 const out=overlayModule(rel,readFileSync(new URL('../../../'+rel,import.meta.url),'utf8'));
 assert(out.includes('data.transportFailure===true'),rel);await transform(out,{loader:'js'});
 if(rel.endsWith('kt117-stage5-document-author.mjs'))assert(out.includes('const editorWordChanges='),'Serialized editor helper is present in deployed overlay');
}
console.log('PASS KT131 complete production overlay pipeline: all status messages and editor helper compile.');
