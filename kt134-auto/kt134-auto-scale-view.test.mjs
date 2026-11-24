import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutoScaleView} from './kt134-auto-scale-view.mjs';
function el(tag){
 return {tag,children:[],dataset:{},style:{},className:'',textContent:'',title:'',
  attributes:{},append(...nodes){this.children.push(...nodes)},
  appendChild(n){this.children.push(n)},
  setAttribute(k,v){this.attributes[k]=v},remove(){this.removed=true}};
}
function app(){
 const document={createElement:el},container=el('main');
 const view=createAutoScaleView({document,container});return {view,container};
}
const status=(states,lastEvent)=>({steps:states.map((status,i)=>({id:i+1,status})),lastEvent});
test('KT134 adds only a new compact panel, never replaces stage tiles',()=>{
 const x=app();assert.equal(x.container.children.length,1);
 assert.equal(x.view.panel.tag,'section');
 assert.match(x.view.panel.innerHTML,/kt134-auto-scale/u);
 const lane=x.view.panel.children[0];
 assert.equal(lane.children.length,7);
 assert.equal(lane.children[0].textContent,'Вход');
 assert.equal(lane.children[6].textContent,'Изход');
});
test('only verified completed states produce visible progress',()=>{
 const x=app();
 let output=x.view.update(status(['completed','completed','not_applicable','active','pending'],
  {subtitle:'Нормативна и процедурна преценка'}));
 assert.equal(output.completed,3);assert.equal(output.ready,false);
 assert.equal(x.view.panel.children[1].children[1].children[0].style.width,'60%');
 assert.equal(x.view.panel.children[1].children[0].textContent,'Нормативна и процедурна преценка');
});
test('all stages completed set exit ready; no fabricated expert approval',()=>{
 const x=app();
 const output=x.view.update(status(Array(5).fill('completed'),{subtitle:'Проект на документ'}));
 assert.equal(output.ready,true);
 assert.equal(x.view.panel.children[0].children[6].dataset.ready,'true');
 assert.ok(!x.view.panel.innerHTML.includes('expertConfirmed'));
});
test('invalid stage states never animate into success',()=>{
 const x=app();
 assert.throws(()=>x.view.update(status(['completed','pending','fake','pending','pending'])),/статус/);
 assert.throws(()=>x.view.update(status(['completed'])),/доказателствен/);
});
test('status subtitles are text, never rendered as HTML',()=>{
 const x=app();
 x.view.update(status(['active','pending','pending','pending','pending'],
  {subtitle:'<script>bad</script>'}));
 const desc=x.view.panel.children[1].children[0];
 assert.equal(desc.textContent,'<script>bad</script>');
});
