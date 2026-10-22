import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canvas,csv,edpuzzle,review,output,outputMany} from '../core.js';
import {readQueue,assignmentExports} from '../batch.js';
const gradebook='Student,ID,SIS User ID,SIS Login ID,Section,Introduction (9001),Conclusion (9002),Unrelated (9003)\nPoints Possible,,,,,10,20,5\n"Rivera, Jamie",001,0001,jamie,Section 1,0.5,EX,4\n"Morgan, Taylor",002,0002,taylor,Section 2,9,0.9,5\n"Patel, Casey",003,0003,casey,Section 1,,0,3\n';
const first='Last name,First name,Username,Edpuzzle: Introduction\nRivera,Jamie,j,90\nMorgan,Taylor,t,80\nPatel,Casey,c,0\n';
const second='Last name,First name,Username,Edpuzzle: Conclusion\nRivera,Jamie,j,100\nMorgan,Taylor,t,100\n';
function entry(name,text){let reads=0;return {file:{name,size:text.length,text:async()=>{reads++;return text;}},get reads(){return reads;}};}
const parsed=()=>[...edpuzzle(first,'first.csv').records,...edpuzzle(second,'second.csv').records];

test('Batch keeps exact headers, points, IDs, legitimate zero, EX and higher cross-cell grades',()=>{
 const b=canvas(gradebook),r=review(b,parsed()),rows=csv(outputMany(b,r.changes,[6,5]));
 assert.deepEqual(rows[0],b.head.slice(0,7));
 assert.deepEqual(rows[1],['Points Possible','','','','','10','20']);
 assert.deepEqual(rows.slice(2),[
  ['Rivera, Jamie','001','0001','jamie','Section 1','9.00','EX'],
  ['Morgan, Taylor','002','0002','taylor','Section 2','9','20.00'],
  ['Patel, Casey','003','0003','casey','Section 1','0.00','0']
 ]);
 assert.equal(rows.some(row=>row.includes('Unrelated (9003)')),false);
});
test('Single-assignment export still includes only changed students and its one assignment',()=>{
 const b=canvas(gradebook),r=review(b,parsed()),rows=csv(output(b,r.changes,5));
 assert.equal(rows[0].length,6);assert.equal(rows.length,4);
 assert.deepEqual(rows.slice(2).map(r=>r[1]),['001','003']);
});
test('Batch omits assignments and students without changes; rejects empty export',()=>{
 const b=canvas(gradebook),r=review(b,edpuzzle(second,'second.csv').records);
 const rows=csv(outputMany(b,r.changes,[5,6,7]));assert.equal(rows[0].length,6);assert.equal(rows.length,3);assert.equal(rows[2][1],'002');
 assert.throws(()=>outputMany(b,[],[5,6]),/No reviewed/);
});
test('Unmatched and ambiguous titles never become new CSV columns',()=>{
 const b=canvas(gradebook),records=parsed().map(r=>({...r,video:'Unknown'}));
 assert.equal(review(b,records).changes.length,0);
 const ambiguous=canvas(gradebook.replace('Conclusion (9002)','Introduction (9002)'));
 assert.equal(review(ambiguous,edpuzzle(first,'first.csv').records).changes.length,0);
});
test('Queue isolates malformed and oversized files, caches successes, and retries failed reads',async()=>{
 const good=entry('first.csv',first),bad=entry('broken.csv','wrong,columns\na,b'),huge=entry('large.csv',first);huge.file.size=26*1024*1024;
 let fail=true,attempts=0;const retry={file:{name:'second.csv',size:second.length,text:async()=>{attempts++;if(fail)throw Error('Read interrupted');return second;}}};
 let result=await readQueue([good,bad,huge,retry]);assert.equal(result.records.length,3);assert.equal(result.issues.length,3);assert.equal(good.status,'ready');assert.equal(bad.status,'failed');assert.equal(huge.reads,0);
 fail=false;result=await readQueue([good,bad,huge,retry]);assert.equal(result.records.length,5);assert.equal(good.reads,1);assert.equal(attempts,2);assert.equal(retry.status,'ready');
});
test('Exact duplicate files are skipped, removing the original lets the duplicate contribute',async()=>{
 const a=entry('same.csv',first),b=entry('same.csv',first);
 assert.equal((await readQueue([a,b])).records.length,3);assert.equal(b.status,'duplicate');
 assert.equal((await readQueue([b])).records.length,3);assert.equal(b.status,'ready');assert.equal(b.reads,1);
});
test('Same filename with changed content remains eligible; repeated identity uses highest score',async()=>{
 const a=entry('same.csv',first),b=entry('same.csv',first.replace('j,90','j,100'));
 const loaded=await readQueue([a,b]),result=review(canvas(gradebook),loaded.records);
 assert.equal(b.status,'ready');assert.equal(result.changes.find(c=>c.student.id==='001').score,10);
});
test('Identical single-video data under different filenames represent different assignments',async()=>{
 const text='Role,Last name,First name,Grade (out of 100)\nStudent,Rivera,Jamie,90';
 const loaded=await readQueue([entry('Introduction.csv',text),entry('Conclusion.csv',text)]);
 assert.deepEqual(loaded.records.map(r=>r.video),['Introduction','Conclusion']);
});
test('Same-content class exports with different filenames do not duplicate grade changes',async()=>{
 const loaded=await readQueue([entry('one.csv',first),entry('two.csv',first)]);
 const result=review(canvas(gradebook),loaded.records);assert.equal(result.changes.length,2);
});
test('Shared names across sections remain ambiguous until mapped to an exact Canvas ID',()=>{
 const b=canvas(gradebook+'"Rivera, Jamie",004,0004,jamie2,Section 2,,,\n');
 const records=edpuzzle(first,'first.csv').records;
 assert.equal(review(b,records).changes.some(c=>c.student.id==='001'||c.student.id==='004'),false);
 const result=review(b,records,{[records[0].person]:'004'});assert.equal(result.changes.find(c=>c.student.id==='004').score,9);
});
test('Downloaded fingerprints exclude successes, but changed scores become pending again',()=>{
 const b=canvas(gradebook),r=review(b,parsed()),ledger=new Map();
 let exports=assignmentExports(b,r.changes,ledger);assert.equal(exports.filter(e=>e.pending).length,2);
 ledger.set(exports[0].assignment.col,exports[0].signature);
 exports=assignmentExports(b,r.changes,ledger);assert.deepEqual(exports.map(e=>e.pending),[false,true]);
 exports.forEach(e=>ledger.set(e.assignment.col,e.signature));assert.equal(assignmentExports(b,r.changes,ledger).some(e=>e.pending),false);
 const newer=review(b,[...parsed(),{...parsed()[0],percent:100}]);
 assert.deepEqual(assignmentExports(b,newer.changes,ledger).map(e=>e.pending),[true,false]);
});
test('Fresh Canvas snapshot after batch import results in no repeated changes',()=>{
 const b=canvas(gradebook),r=review(b,parsed());
 const fresh=canvas(outputMany(b,r.changes,[5,6]));
 assert.equal(review(fresh,parsed()).changes.length,0);
});
test('Large cached file records and issues avoid function argument limits',async()=>{
 const record=edpuzzle(first,'first.csv').records[0],count=150000;
 const cached={file:{name:'large-valid.csv'},parsed:{records:Array(count).fill(record),issues:Array(count).fill('Fixture warning')},sourceKey:'large-valid'};
 const loaded=await readQueue([cached]);assert.equal(cached.status,'ready');assert.equal(loaded.records.length,count);assert.equal(loaded.issues.length,count);
});
