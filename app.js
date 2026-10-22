import {canvas,review,outputMany} from './core.js?v=20261022-batch';
import {readQueue,assignmentExports} from './batch.js?v=20261022-batch';
const $=id=>document.getElementById(id);let book,records=[],issues=[],pm={},vm={},result,busy=false,version=0;let canvasFiles=[],edpuzzleFiles=[],nextFileId=0;const urls=[],downloaded=new Map();
function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
function forget(resetMatches=false){
 version++;book=null;records=[];issues=[];result=null;
 if(resetMatches){pm={};vm={};downloaded.clear();}
 urls.splice(0).forEach(URL.revokeObjectURL);$('results').hidden=true;$('ack').checked=false;
 $('error').textContent='';$('status').textContent='';$('exportFeedback').textContent='';
}
function renderQueue(){
 $('edpuzzle-selected').textContent=edpuzzleFiles.length+' file'+(edpuzzleFiles.length===1?'':'s')+' queued';
 $('fileQueue').replaceChildren();
 edpuzzleFiles.forEach(entry=>{
  const row=el('li'),label=el('span',entry.file.name+' — '+(entry.message||'Pending check')),remove=el('button','Remove');
  remove.className='secondary';remove.type='button';remove.setAttribute('aria-label','Remove '+entry.file.name);
  remove.onclick=()=>{edpuzzleFiles=edpuzzleFiles.filter(e=>e.id!==entry.id);forget();renderQueue();};
  row.append(label,remove);$('fileQueue').append(row);
 });
}
function matchRows(target,items,choices,mapping,keyFor,labelFor,selected){target.replaceChildren();items.forEach(item=>{const key=keyFor(item),row=el('div');row.className='match';const label=el('label',labelFor(item)),select=el('select');select.id='match-'+target.id+'-'+target.children.length;label.htmlFor=select.id;const skip=el('option','Skip / not matched');skip.value='';select.append(skip);choices.forEach(c=>{const o=el('option',c.label);o.value=c.value;select.append(o);});select.value=selected[key];select.onchange=()=>{mapping[key]=select.value;render();};row.append(label,select);target.append(row);});}
function render(){result=review(book,records,pm,vm,$('policy').value);$('ack').checked=false;$('exportFeedback').textContent='';$('results').hidden=false;matchRows($('people'),result.people,book.students.map(s=>({value:s.id,label:s.name+' · ID '+s.id})),pm,p=>p.person,p=>p.name+(p.username?' · '+p.username:''),result.personTargets);matchRows($('videos'),result.titles,book.assignments.map(a=>({value:String(a.col),label:a.title+' · '+a.max+' points'})),vm,t=>t,t=>t,result.videoTargets);
 $('personCount').textContent='('+result.people.filter(p=>!result.personTargets[p.person]).length+' unmatched)';$('videoCount').textContent='('+result.titles.filter(t=>result.videoTargets[t]==='').length+' unmatched)';$('counts').textContent=result.changes.length+' grade changes ready · '+result.skipped.length+' records skipped';$('preview').replaceChildren();result.changes.forEach(c=>{const tr=el('tr');[c.student.name,c.assignment.title,c.old||'Blank',c.score.toFixed(2)+' / '+c.assignment.max].forEach(t=>tr.append(el('td',t)));$('preview').append(tr);});const messages=[...issues,...result.skipped.map(s=>s.name+' · '+s.video+': '+s.reason)];$('issues').replaceChildren(...messages.map(m=>el('li',m)));$('issueCount').textContent='('+messages.length+')';updateExport();
 const missingPeople=result.people.filter(p=>!result.personTargets[p.person]).length,missingVideos=result.titles.filter(t=>result.videoTargets[t]==='').length;
 $('people').closest('details').open=missingPeople>0;
 $('videos').closest('details').open=true;
 if(!result.changes.length){const tr=el('tr'),td=el('td','No grade changes are ready yet. See the explanation below.');td.colSpan=4;tr.append(td);$('preview').append(tr);}
}
function updateExport(){
 const exports=assignmentExports(book,result.changes,downloaded),pending=exports.filter(e=>e.pending);
 const select=$('exportAssignment'),previous=select.value;select.replaceChildren();
 exports.forEach(({assignment:a,count})=>{const o=el('option',a.title+' ('+count+' students)');o.value=String(a.col);select.append(o);});
 if(exports.some(e=>String(e.assignment.col)===previous))select.value=previous;
 $('exportChoice').hidden=exports.length<2;
 $('ack').disabled=!exports.length;
 $('exportButton').disabled=!exports.length||!$('ack').checked;
 $('exportAllButton').disabled=!pending.length||!$('ack').checked;
 $('exportAllButton').textContent='Export all pending ('+pending.length+')';
 $('assignmentStatus').replaceChildren(...exports.map(e=>el('li',e.assignment.title+' — '+e.count+' changes · '+(e.pending?'Pending download':'Download requested for this version — Canvas import not confirmed'))));
 if(!exports.length){
  const missingPeople=result.people.filter(p=>!result.personTargets[p.person]).length,missingVideos=result.titles.filter(t=>result.videoTargets[t]==='').length;
  let reason='';
  if(!records.length)reason='No usable Edpuzzle scores were found. Check the file queue and “Scores left out and file problems” above. Remove or replace a failed file, or click Check and match to retry it.';
  else if(missingVideos||missingPeople)reason='Some names or assignments still need your help. Open the matching sections above and choose the correct Canvas student or assignment. Anything left on “Skip / not matched” will be left out.';
  else if(result.skipped.some(s=>s.reason.includes('Multiple Edpuzzle')))reason='Two Edpuzzle students are linked to the same Canvas student. Check “Student matches” above and correct the match or skip one.';
  else if(result.skipped.some(s=>s.reason==='Existing grade protected'))reason='Canvas already has grades for these students. The “fill empty grades only” setting keeps those grades. If you intend to update them, change the grade policy above, then review the new grades.';
  else reason='These grades already match Canvas, or the current settings keep the existing grades. Open “Scores left out and file problems” above to see why each score was left out.';
  $('exportHelp').textContent='Nothing to export yet. '+reason;
 }else if(!pending.length){
  $('exportHelp').textContent='All current changes have a download request in this tab; Canvas import is not confirmed. You can download one assignment again below. To update later scores, add fresh Edpuzzle exports and check again; use a fresh Canvas gradebook after importing.';
 }else $('exportHelp').textContent=$('ack').checked?'Ready: export all '+pending.length+' pending assignments in one CSV, or export one assignment below.':'Review all proposed changes, then check the box below to unlock downloads. Unmatched or protected scores are left out.';
}
$('ack').onchange=()=>{if(result)updateExport();};
$('exportAssignment').onchange=()=>{$('exportFeedback').textContent='';};
function downloadAssignments(all){
 if(!result||!$('ack').checked||!result.changes.length)return;
 const exports=assignmentExports(book,result.changes,downloaded);
 const selected=all?exports.filter(e=>e.pending):exports.filter(e=>e.assignment.col===Number($('exportAssignment').value));
 if(!selected.length)return;
 let link,url;
 try{
  const csv=outputMany(book,result.changes,selected.map(e=>e.assignment.col));
  url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));urls.push(url);
  link=el('a');link.href=url;
  link.download=all?'canvas-all-pending.csv':'canvas-'+selected[0].assignment.title.replace(/[^a-z0-9]+/gi,'-').slice(0,100)+'.csv';
  document.body.append(link);link.click();link.remove();
  selected.forEach(e=>downloaded.set(e.assignment.col,e.signature));
  updateExport();
  $('exportFeedback').textContent='Download requested: '+link.download+' ('+selected.length+' assignment'+(selected.length===1?'':'s')+'). This does not confirm that the browser saved it or that Canvas imported it. Next: Canvas course → Grades → Import, then review every change before saving. If the download was blocked, use “Reset download status” to retry.';
 }catch(error){
  if(link)link.remove();
  $('exportFeedback').textContent='Download could not start: '+error.message+'. Nothing was marked downloaded; try again.';
 }
}
$('exportButton').onclick=()=>downloadAssignments(false);
$('exportAllButton').onclick=()=>downloadAssignments(true);
$('resetDownloads').onclick=()=>{downloaded.clear();if(result)updateExport();$('exportFeedback').textContent='Download status reset. No Canvas grades were changed.';};
$('policy').onchange=()=>{if(book)render();};
$('review').onclick=async()=>{
 if(busy)return;
 const cf=canvasFiles[0],efs=[...edpuzzleFiles];forget();
 if(!cf||!efs.length){$('error').textContent='Choose your Canvas CSV and at least one Edpuzzle CSV.';return;}
 if(cf.size>25*1024*1024){$('error').textContent='Choose a Canvas CSV smaller than 25 MB.';return;}
 const token=version;busy=true;$('review').disabled=true;$('status').textContent='Checking your files…';
 try{
  const nextBook=canvas(await cf.text());
  const parsed=await readQueue(efs);
  if(token!==version)return;
  book=nextBook;records=parsed.records;issues=parsed.issues;renderQueue();render();
  const failed=efs.filter(e=>e.status==='failed').length;
  $('status').textContent=book.students.length+' Canvas students · '+records.length+' valid Edpuzzle scores. '+(failed?failed+' file(s) failed; valid files are ready. Click Check and match to retry failed files.':'Review the matches below.');
 }catch(e){if(token===version){forget();$('error').textContent=e.message;}}
 finally{busy=false;$('review').disabled=false;}
};
function chooseFiles(id,files){
 const list=[...files];if(!list.length)return;
 if(id==='canvas'){
  if(list.length!==1||!list[0].name.toLowerCase().endsWith('.csv')){
   $('error').textContent='Choose just one Canvas gradebook CSV. The previous file has not been replaced.';return;
  }
  canvasFiles=list;forget(true);$('canvas-selected').textContent=list[0].name;
 }else{
  const valid=list.filter(f=>f.name.toLowerCase().endsWith('.csv'));
  if(!valid.length){$('error').textContent='Please choose CSV files only. Existing queued files were kept.';return;}
  forget();edpuzzleFiles.push(...valid.map(file=>({id:++nextFileId,file,status:'pending'})));renderQueue();
  if(valid.length!==list.length)$('error').textContent='Non-CSV files were skipped. Existing queued files were kept.';
 }
 $(id).value='';
 $('status').textContent=id==='canvas'?'Canvas gradebook selected. Add Edpuzzle files, then check and match.':edpuzzleFiles.length+' Edpuzzle files queued. You can add more, then check and match.';
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
function clearChoices(){canvasFiles=[];edpuzzleFiles=[];$('fileQueue').replaceChildren();['canvas','edpuzzle'].forEach(id=>{$(id).value='';$(id+'-selected').textContent='';$(id+'-drop').classList.remove('dragover');});}
$('clear').onclick=()=>{forget(true);$('policy').value='raise';clearChoices();$('status').textContent='Files and grades cleared from this tab.';};
