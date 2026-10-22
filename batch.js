import {edpuzzle,output} from './core.js?v=20261022-batch';

// Keep successfully read files in memory. A retry reads only failed/new files.
// Filename is part of the key because single-video exports derive their title from it.
export async function readQueue(entries){
 const seen=new Set(),records=[],issues=[];
 for(const entry of entries){
  try{
   if(!entry.parsed){
    if(entry.file.size>25*1024*1024)throw Error('Choose a CSV smaller than 25 MB.');
    const text=await entry.file.text();
    entry.parsed=edpuzzle(text,entry.file.name);entry.sourceKey=JSON.stringify([entry.file.name,text]);
   }
   if(seen.has(entry.sourceKey)){entry.status='duplicate';entry.message='Duplicate file skipped';continue;}
   seen.add(entry.sourceKey);entry.status='ready';entry.message=entry.parsed.records.length+' valid scores';
   for(const record of entry.parsed.records)records.push(record);
   for(const issue of entry.parsed.issues)issues.push(issue);
  }catch(error){
   entry.status='failed';
   const prefix=entry.file.name+': ';
   entry.message=error.message.startsWith(prefix)?error.message.slice(prefix.length):error.message;
   issues.push(prefix+entry.message);
  }
 }
 return {records,issues};
}

export function assignmentExports(book,changes,downloaded=new Map()){
 return book.assignments.filter(a=>changes.some(c=>c.assignment.col===a.col)).map(assignment=>{
  const signature=output(book,changes,assignment.col);
  return {assignment,signature,count:changes.filter(c=>c.assignment.col===assignment.col).length,pending:downloaded.get(assignment.col)!==signature};
 });
}
