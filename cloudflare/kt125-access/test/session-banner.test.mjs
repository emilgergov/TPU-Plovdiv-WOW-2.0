import assert from 'node:assert/strict';
import {withSessionBanner} from '../src/local-auth/session-banner.mjs';
const user={verified:true,displayName:'Тестов <Експерт>',username:'test1234',role:'expert'};
const html=await (await withSessionBanner(new Response('<html><head></head><body><h1>Модул</h1></body></html>',{headers:{'Content-Type':'text/html','Cache-Control':'no-store, private'}}),user)).text();
assert(html.includes('Тестов &lt;Експерт&gt;'));assert(html.includes('(test1234)'));assert(html.includes('Експерт'));assert(html.includes('position:sticky'));assert(html.includes('action="/auth/logout"'));
assert(html.includes('<h1>Модул</h1>'));
const json=new Response('{"ok":true}',{headers:{'Content-Type':'application/json'}});assert.equal(await withSessionBanner(json,user),json);
const anonymous=new Response('anonymous',{headers:{'Content-Type':'text/html'}});assert.equal(await withSessionBanner(anonymous,null),anonymous);
console.log('PASS server identity banner: escaped name, username/role, original content preserved, no JSON or anonymous injection');
