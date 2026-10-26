import { AppError, duplicates, followedUp, importedApplication, newApplication, updateApplication } from './domain';
import type {Application,Draft,Snapshot} from './domain';
export type Mutation={action:'save'|'delete'|'followup'|'import';draft?:Draft;id?:string;revision?:number;allowDuplicate?:boolean;date?:string;record?:Application;decision?:'add'|'update'|'copy'};
export interface Store { mode:'cloud'|'local'; load:()=>Promise<Snapshot>; mutate:(m:Mutation)=>Promise<Application|null>; preferences:(days:number)=>Promise<void>; subscribe?:(fn:()=>void)=>()=>void; }
export function applyMutation(records:Application[],m:Mutation):{applications:Application[];record:Application|null} {
  let old=records.find(a=>a.id===(m.id||m.record?.id));let next:Application|null=null;
  if(m.action==='import') {
    if(!m.record)throw new AppError('Import data is missing.');
    if(m.decision==='update'){if(!old||old.revision!==m.revision)throw new AppError('This application changed. Refresh and review it before restoring.','CONFLICT');next=importedApplication(m.record,old);}
    else {if(old)throw new AppError('An application with this ID already exists. Review the import.','CONFLICT');next=importedApplication(m.record);}
  }else if(m.id) {
    if(!old||old.revision!==m.revision)throw new AppError('This application changed on another screen. Reopen it to use the latest version.','CONFLICT');
    if(m.action==='delete')return {applications:records.filter(a=>a.id!==m.id),record:null};
    next=m.action==='followup'?followedUp(old,m.date||''):updateApplication(old,m.draft!);
  }else { if(m.action!=='save')throw new AppError('Application ID is missing.');next=newApplication(m.draft!); }
  if(m.action==='save'&&!m.allowDuplicate) {const matches=duplicates(next,records,old?.id);if(matches.length)throw new AppError('This looks similar to an existing application.','DUPLICATE',matches);}
  return {applications:[...records.filter(a=>a.id!==next!.id),next],record:next};
}
export function createLocalStore(key='application-command-center-v1'):Store {
  async function lock<T>(fn:()=>T):Promise<T>{if(typeof navigator!=='undefined'&&navigator.locks)return navigator.locks.request(key,fn);return fn();}
  function read():Snapshot {const saved=localStorage.getItem(key);if(!saved)return {applications:[],warningDays:3};try {const data=JSON.parse(saved);if(!Array.isArray(data.applications))throw new Error();return data;}catch{throw new AppError('Saved browser data could not be read. Export or recover your backup before clearing browser storage.');}}
  return {mode:'local',load:async()=>read(),mutate:async m=>lock(()=>{const s=read(),r=applyMutation(s.applications,m);localStorage.setItem(key,JSON.stringify({...s,applications:r.applications}));return r.record;}),preferences:async warningDays=>lock(()=>{localStorage.setItem(key,JSON.stringify({...read(),warningDays}));}),subscribe:fn=>{const handler=(e:StorageEvent)=>{if(e.key===key)fn();};window.addEventListener('storage',handler);return ()=>window.removeEventListener('storage',handler);}};
}
