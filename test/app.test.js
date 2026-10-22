import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {csv} from '../core.js';

// No browser, network, account, or real grade data: exercise event handlers
// through a minimal DOM, including failed downloads and interrupted file reads.
const book='Student,ID,Section,Introduction (9001),Conclusion (9002)\nPoints Possible,,,10,20\n"Rivera, Jamie",001,Sample,0.5,EX\n"Morgan, Taylor",002,Sample,9,0.9\n';
const first='Last name,First name,Username,Edpuzzle: Introduction\nRivera,Jamie,j,90\nMorgan,Taylor,t,80\n';
const second='Last name,First name,Username,Edpuzzle: Conclusion\nMorgan,Taylor,t,100\n';
const file=(name,text)=>({name,size:text.length,text:async()=>text});
let counter=0;
async function setup(){
 const downloads=[],blobs=new Map(),nodes=new Map();let failDownload=false;
 class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this._value='';this.checked=false;this.disabled=false;this.hidden=false;this.textContent='';this.files=[];this.listeners={};this.classList={add(){},remove(){}};}
  get value(){if(this.tag==='select')return this.children.some(c=>c.value===this._value)?this._value:(this.children[0]?.value||'');return this._value;}
  set value(v){this._value=String(v);}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;this._value='';}
  setAttribute(name,value){this[name]=value;}
  closest(){return this.details??=new Element('details');}
  addEventListener(name,fn){this.listeners[name]=fn;}
  remove(){}
  click(){if(this.tag==='a'){if(failDownload)throw Error('Fixture download blocked');downloads.push({name:this.download,blob:blobs.get(this.href)});}}
 }
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 for(const match of html.matchAll(/<(\w+)[^>]*\bid="([^"]+)"[^>]*>/g)){const n=new Element(match[1]);n.id=match[2];nodes.set(n.id,n);}
 // The policy options would normally be parsed by the browser.
 const policy=nodes.get('policy');for(const value of ['raise','blank','replace']){const o=new Element('option');o.value=value;policy.append(o);}
 globalThis.document={getElementById:id=>{assert(nodes.has(id),'Missing DOM node '+id);return nodes.get(id);},createElement:tag=>new Element(tag),body:new Element('body')};
 globalThis.window={addEventListener(){}};
 URL.createObjectURL=blob=>{const url='blob:fixture-'+blobs.size;blobs.set(url,blob);return url;};URL.revokeObjectURL=url=>blobs.delete(url);
 await import('../app.js?fixture='+counter++);
 const $=id=>nodes.get(id);
 const choose=(id,files)=>{$(id).files=files;$(id).onchange();};
 const check=()=>$('review').onclick();
 const acknowledge=()=>{$('ack').checked=true;$('ack').onchange();};
 return {$,choose,check,acknowledge,downloads,blockDownload:v=>{failDownload=v;}};
}

test('UI adds separately selected files, exports all once, and retains single export',async()=>{
 const app=await setup(),{$,choose,check,acknowledge,downloads}=app;
 choose('canvas',[file('canvas.csv',book)]);choose('edpuzzle',[file('first.csv',first)]);choose('edpuzzle',[file('second.csv',second)]);
 assert.equal($('fileQueue').children.length,2);await check();assert.match($('counts').textContent,/2 grade changes/);
 assert.equal($('exportAllButton').disabled,true);$('exportAllButton').onclick();assert.equal(downloads.length,0);
 acknowledge();$('exportAllButton').onclick();assert.equal(downloads.length,1);assert.equal(downloads[0].name,'canvas-all-pending.csv');
 const rows=csv(await downloads[0].blob.text());assert.deepEqual(rows[0].slice(-2),['Introduction (9001)','Conclusion (9002)']);assert.deepEqual(rows[2].slice(-2),['9.00','EX']);
 assert.equal($('exportAllButton').disabled,true);$('exportAllButton').onclick();assert.equal(downloads.length,1);
 $('exportButton').onclick();assert.equal(downloads.length,2);assert.equal(csv(await downloads[1].blob.text())[0].length,4);
 await check();assert.match($('exportAllButton').textContent,/\(0\)/);assert.equal($('ack').checked,false);
});
test('UI failures do not block valid files; later changes reopen only changed assignment',async()=>{
 const {$,choose,check,acknowledge,downloads}=await setup();
 choose('canvas',[file('canvas.csv',book)]);choose('edpuzzle',[file('first.csv',first),file('broken.csv','x,y\na,b')]);await check();
 assert.match($('status').textContent,/1 file\(s\) failed/);assert.match($('counts').textContent,/1 grade changes/);acknowledge();$('exportAllButton').onclick();
 choose('edpuzzle',[file('first.csv',first.replace('j,90','j,100'))]);assert.equal($('results').hidden,true);assert.equal($('ack').checked,false);await check();
 assert.match($('exportAllButton').textContent,/\(1\)/);acknowledge();$('exportAllButton').onclick();assert.equal(downloads.length,2);
 assert.equal(csv(await downloads[1].blob.text())[2].at(-1),'10.00');
 $('fileQueue').children[1].children[1].onclick();assert.equal($('fileQueue').children.length,2);assert.equal($('results').hidden,true);
});
test('UI download exceptions retain pending work; reset permits deliberate retry',async()=>{
 const app=await setup(),{$,choose,check,acknowledge,downloads}=app;
 choose('canvas',[file('canvas.csv',book)]);choose('edpuzzle',[file('first.csv',first)]);await check();acknowledge();
 app.blockDownload(true);$('exportAllButton').onclick();assert.match($('exportFeedback').textContent,/Nothing was marked downloaded/);assert.equal(downloads.length,0);assert.equal($('exportAllButton').disabled,false);
 app.blockDownload(false);$('exportAllButton').onclick();assert.equal(downloads.length,1);assert.equal($('exportAllButton').disabled,true);
 $('resetDownloads').onclick();assert.equal($('exportAllButton').disabled,false);$('exportAllButton').onclick();assert.equal(downloads.length,2);
});
test('Clear during an asynchronous read cannot resurrect stale results or acknowledgement',async()=>{
 const {$,choose,check}=await setup();let release;
 choose('canvas',[{name:'canvas.csv',size:1,text:()=>new Promise(resolve=>{release=resolve;})}]);choose('edpuzzle',[file('first.csv',first)]);
 const running=check();assert.equal($('review').disabled,true);$('clear').onclick();release(book);await running;
 assert.equal($('results').hidden,true);assert.equal($('ack').checked,false);assert.equal($('fileQueue').children.length,0);assert.equal($('review').disabled,false);assert.match($('status').textContent,/cleared/);
});
test('Selecting new input during a read invalidates old results; next check uses new queue',async()=>{
 const {$,choose,check}=await setup();let release;
 choose('canvas',[{name:'canvas.csv',size:1,text:()=>new Promise(resolve=>{release=resolve;})}]);choose('edpuzzle',[file('first.csv',first)]);
 const running=check();choose('edpuzzle',[file('second.csv',second)]);release(book);await running;assert.equal($('results').hidden,true);
 choose('canvas',[file('canvas.csv',book)]);await check();assert.match($('counts').textContent,/2 grade changes/);assert.equal($('ack').checked,false);
});
test('Invalid input preserves existing queue; policy and match edits require a new acknowledgement',async()=>{
 const {$,choose,check,acknowledge}=await setup();choose('canvas',[file('canvas.csv',book)]);choose('edpuzzle',[file('first.csv',first)]);
 choose('edpuzzle',[file('wrong.pdf','bad')]);assert.equal($('fileQueue').children.length,1);await check();acknowledge();
 $('policy').value='blank';$('policy').onchange();assert.equal($('ack').checked,false);assert.equal($('exportAllButton').disabled,true);
 $('policy').value='raise';$('policy').onchange();acknowledge();const select=$('videos').children[0].children[1];select.value='';select.onchange();assert.equal($('ack').checked,false);assert.equal($('exportAllButton').disabled,true);
});
test('A single-assignment download is excluded from the next all-pending CSV',async()=>{
 const {$,choose,check,acknowledge,downloads}=await setup();choose('canvas',[file('canvas.csv',book)]);choose('edpuzzle',[file('first.csv',first),file('second.csv',second)]);await check();acknowledge();
 $('exportButton').onclick();assert.match($('exportAllButton').textContent,/\(1\)/);$('exportAllButton').onclick();
 assert.equal(downloads.length,2);assert.equal(csv(await downloads[1].blob.text())[0].at(-1),'Conclusion (9002)');assert.equal(csv(await downloads[1].blob.text())[0].length,4);
});
