import {canvas,edpuzzle,review,output} from './core.js';
const $=id=>document.getElementById(id);let book,records=[],issues=[],pm={},vm={},result,busy=false,version=0;let canvasFiles=[],edpuzzleFiles=[];const urls=[];
function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
function forget(){version++;book=null;records=[];issues=[];pm={};vm={};result=null;urls.splice(0).forEach(URL.revokeObjectURL);$('results').hidden=true;$('ack').checked=false;$('error').textContent='';$('status').textContent='';$('policy').value='blank';}
function matchRows(target,items,choices,mapping,keyFor,labelFor,selected){target.replaceChildren();items.forEach(item=>{const key=keyFor(item),row=el('div');row.className='match';const label=el('label',labelFor(item)),select=el('select');select.id='match-'+target.id+'-'+target.children.length;label.htmlFor=select.id;const skip=el('option','Skip / not matched');skip.value='';select.append(skip);choices.forEach(c=>{const o=el('option',c.label);o.value=c.value;select.append(o);});select.value=selected[key];select.onchange=()=>{mapping[key]=select.value;render();};row.append(label,select);target.append(row);});}
function render(){result=review(book,records,pm,vm,$('policy').value);$('ack').checked=false;$('results').hidden=false;matchRows($('people'),result.people,book.students.map(s=>({value:s.id,label:s.name+' · ID '+s.id})),pm,p=>p.person,p=>p.name+(p.username?' · '+p.username:''),result.personTargets);matchRows($('videos'),result.titles,book.assignments.map(a=>({value:String(a.col),label:a.title+' · '+a.max+' points'})),vm,t=>t,t=>t,result.videoTargets);
 $('personCount').textContent='('+result.people.filter(p=>!result.personTargets[p.person]).length+' unmatched)';$('videoCount').textContent='('+result.titles.filter(t=>result.videoTargets[t]==='').length+' unmatched)';$('counts').textContent=result.changes.length+' grade changes ready · '+result.skipped.length+' records skipped';$('preview').replaceChildren();result.changes.forEach(c=>{const tr=el('tr');[c.student.name,c.assignment.title,c.old||'Blank',c.score.toFixed(2)+' / '+c.assignment.max].forEach(t=>tr.append(el('td',t)));$('preview').append(tr);});const messages=[...issues,...result.skipped.map(s=>s.name+' · '+s.video+': '+s.reason)];$('issues').replaceChildren(...messages.map(m=>el('li',m)));$('issueCount').textContent='('+messages.length+')';$('downloads').replaceChildren();[...new Set(result.changes.map(c=>c.assignment.col))].forEach(col=>{const a=book.assignments.find(a=>a.col===col),b=el('button','Download '+a.title);b.disabled=true;b.onclick=()=>{const url=URL.createObjectURL(new Blob([output(book,result.changes,col)],{type:'text/csv;charset=utf-8'}));urls.push(url);const link=el('a');link.href=url;link.download='canvas-'+a.title.replace(/[^a-z0-9]+/gi,'-').slice(0,100)+'.csv';document.body.append(link);link.click();link.remove();$('status').textContent='Downloaded '+a.title+'. Import this file in Canvas and review its preview.';};$('downloads').append(b);});}
$('ack').onchange=()=>{$('downloads').querySelectorAll('button').forEach(b=>b.disabled=!$('ack').checked);};$('policy').onchange=()=>{if(book)render();};
$('review').onclick=async()=>{if(busy)return;const cf=canvasFiles[0],efs=[...edpuzzleFiles];forget();if(!cf||!efs.length){$('error').textContent='Choose your Canvas CSV and at least one Edpuzzle CSV.';return;}if([cf,...efs].some(f=>f.size>25*1024*1024)){$('error').textContent='Choose CSV files smaller than 25 MB each.';return;}const token=version;busy=true;$('review').disabled=true;$('status').textContent='Checking your files…';try{const nextBook=canvas(await cf.text()),parsed=[];for(const f of efs)parsed.push(edpuzzle(await f.text(),f.name));if(token!==version)return;book=nextBook;records=parsed.flatMap(p=>p.records);issues=parsed.flatMap(p=>p.issues);render();$('status').textContent=book.students.length+' Canvas students · '+records.length+' valid Edpuzzle scores. Review the matches below.';}catch(e){if(token===version){forget();$('error').textContent=e.message;}}finally{busy=false;$('review').disabled=false;}};
function chooseFiles(id,files){
 forget(); const list=[...files];
 if(list.some(f=>!f.name.toLowerCase().endsWith('.csv'))||(id==='canvas'&&list.length>1)){
  if(id==='canvas')canvasFiles=[];else edpuzzleFiles=[];
  $(id).value='';$(id+'-selected').textContent='';
  $('error').textContent=id==='canvas'&&list.length>1?'Choose just one Canvas gradebook CSV.':'Please choose CSV files only.';return;
 }
 if(id==='canvas')canvasFiles=list;else edpuzzleFiles=list;
 $(id+'-selected').textContent=list.length?list.map(f=>f.name).join(' · '):'';
 $('status').textContent=list.length?list.length+' '+(id==='canvas'?'Canvas':'Edpuzzle')+' file'+(list.length===1?'':'s')+' selected. Choose both gradebooks, then check and match.':'';
}
['canvas','edpuzzle'].forEach(id=>{
 $(id).onchange=()=>chooseFiles(id,$(id).files);
 const zone=$(id+'-drop');let depth=0;
 zone.addEventListener('dragenter',e=>{e.preventDefault();depth++;zone.classList.add('dragover');});
 zone.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';});
 zone.addEventListener('dragleave',e=>{e.preventDefault();depth--;if(depth<=0){depth=0;zone.classList.remove('dragover');}});
 zone.addEventListener('drop',e=>{e.preventDefault();depth=0;zone.classList.remove('dragover');$(id).value='';chooseFiles(id,e.dataTransfer.files);});
});
// Prevent a missed drop from navigating away and discarding the current review.
window.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files'))e.preventDefault();});
window.addEventListener('drop',e=>{if([...e.dataTransfer.types].includes('Files'))e.preventDefault();});
function clearChoices(){canvasFiles=[];edpuzzleFiles=[];['canvas','edpuzzle'].forEach(id=>{$(id).value='';$(id+'-selected').textContent='';$(id+'-drop').classList.remove('dragover');});}
$('clear').onclick=()=>{forget();clearChoices();$('status').textContent='Files and grades cleared from this tab.';};
$('demo').onclick=()=>{forget();clearChoices();book=canvas('Student,ID,SIS User ID,Section,Introduction (9001)\nPoints Possible,,,,10\n"Rivera, Jamie",10001,example-jamie,Sample,\n"Morgan, Taylor",10002,example-taylor,Sample,7\n');const p=edpuzzle('Last name,First name,Username,Edpuzzle: Introduction\nRivera,Jamie,jamie.example,90\nMorgan,Taylor,taylor.example,80\n','Sample.csv');records=p.records;render();$('status').textContent='Sample mode: fictional students only. Jamie gets 9/10; Taylor’s existing 7/10 stays protected.';};
