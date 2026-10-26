import { EMPTY_DRAFT, newId, validateDraft, validateHistory, validateId } from './domain';
import type { Application } from './domain';
export const CSV_COLUMNS=['id','company','jobTitle','status','postingUrl','salaryRange','location','applicationDate','deadline','followUpDate','notes','activityHistory','csvEncoding'];
function protect(s:string) { return /^[=+\-@\t\r']/.test(s) ? "'"+s : s; }
function unprotect(s:string) { return /^'[=+\-@\t\r']/.test(s) ? s.slice(1) : s; }
function quote(s:string) { return '"'+s.replace(/"/g,'""')+'"'; }
export function exportCsv(records:Application[]) { return '\ufeff'+[CSV_COLUMNS.join(','),...records.map(a=>CSV_COLUMNS.map(k=>quote(k==='csvEncoding'?'acc-v1':k==='activityHistory'?JSON.stringify(a.activityHistory):protect(String(a[k as keyof Application]??'')))).join(','))].join('\r\n'); }
export function parseCsv(text:string):string[][] {
  const rows:string[][]=[]; let row:string[]=[];let value='';let quoted=false;let closed=false;
  text=text.replace(/^\ufeff/,'');
  for(let i=0;i<text.length;i++) { const c=text[i];
    if(quoted) { if(c==='"') {if(text[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}} else value+=c; continue; }
    if(c===',' || c==='\r' || c==='\n') { row.push(value);value='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++; if(row.some(x=>x!==''))rows.push(row);row=[];}continue; }
    if(c==='"' && !value && !closed) { quoted=true;continue; }
    if(closed || c==='"') throw new Error('Invalid CSV quoting. Export the file as standard CSV and try again.');
    value+=c;
  }
  if(quoted)throw new Error('The CSV has an unclosed quotation mark.');
  if(value||row.length){row.push(value);if(row.some(x=>x!==''))rows.push(row);}
  return rows;
}
export type ImportRow={index:number;record:Application|null;error:string;done?:boolean;decision:'skip'|'add'|'update'|'copy';targetId?:string;revision?:number;warnings:string[]};
export function readCsv(text:string):ImportRow[] {
  const grid=parseCsv(text); if(!grid.length)throw new Error('This CSV is empty.');
  const headers=grid.shift()!.map(h=>h.trim().toLowerCase().replace(/[ _-]/g,''));
  if(new Set(headers).size!==headers.length)throw new Error('The CSV contains duplicate column names.');
  if(!headers.includes('company')||!headers.includes('jobtitle'))throw new Error('The CSV needs Company and Job Title columns. Download the template for the full format.');
  if(grid.length>500)throw new Error('Import up to 500 applications at a time. Split this file into smaller files.');
  return grid.map((cells,i)=>{ try {
    if(cells.length!==headers.length)throw new Error('This row has the wrong number of columns.');
    const raw=Object.fromEntries(headers.map((h,j)=>[h,cells[j]]));const encoded=raw.csvencoding==='acc-v1'; const fields:Record<string,string>={};
    for(const key of Object.keys(EMPTY_DRAFT))fields[key]=encoded?unprotect(raw[key.toLowerCase()]||''):raw[key.toLowerCase()]||'';
    const draft=validateDraft(fields);const id=raw.id?validateId(raw.id):newId();
    const history=validateHistory(raw.activityhistory?JSON.parse(raw.activityhistory):[]);
    return {index:i+2,record:{...draft,id,revision:1,updatedAt:new Date().toISOString(),activityHistory:history},error:'',decision:'add' as const,warnings:[]};
  }catch(e){return {index:i+2,record:null,error:e instanceof Error?e.message:'Invalid row',decision:'skip' as const,warnings:[]};} });
}
