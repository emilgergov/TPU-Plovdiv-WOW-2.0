import assert from 'node:assert/strict';
import {editorWordChanges} from '../src/kt126/prepared-text-editor.mjs';
const before='На основание чл. 2 Ви уведомявам следното.',after='На основание чл. 2 Ви уведомявам, че е установено следното.';
for(const [a,b] of [[before,after],['','добавено'],['изтрито',''],['Еднакво.','Еднакво.'],['а '.repeat(2000),'б '.repeat(2000)]]){
 const parts=editorWordChanges(a,b);
 assert.equal(parts.filter(p=>p.kind!=='added').map(p=>p.text).join(''),a);
 assert.equal(parts.filter(p=>p.kind!=='removed').map(p=>p.text).join(''),b);
}
const parts=editorWordChanges(before,after);assert(parts.some(p=>p.kind==='same'&&p.text.includes('чл. 2')));assert(!parts.some(p=>p.kind==='removed'&&p.text.includes('чл. 2')));
console.log('PASS KT131 word differences: exact reconstruction, unchanged legal reference, additions/deletions, bounded long-document fallback.');
