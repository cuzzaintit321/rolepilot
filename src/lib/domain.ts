export function newId(){if(typeof crypto.randomUUID==='function')return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
export const STATUSES = ['Saved', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn'] as const;
export type Status = typeof STATUSES[number];
export type HistoryEvent = { id: string; timestamp: string; type: 'created' | 'status_change' | 'followed_up'; detail: string };
export type Draft = { company: string; jobTitle: string; status: Status; postingUrl: string; salaryRange: string; location: string; applicationDate: string; deadline: string; followUpDate: string; notes: string };
export type Application = Draft & { id: string; revision: number; updatedAt: string; activityHistory: HistoryEvent[] };
export type Snapshot = { applications: Application[]; warningDays: number };
export const EMPTY_DRAFT: Draft = { company: '', jobTitle: '', status: 'Saved', postingUrl: '', salaryRange: '', location: '', applicationDate: '', deadline: '', followUpDate: '', notes: '' };
export class AppError extends Error { code: string; matches?: Application[]; constructor(message: string, code = 'VALIDATION', matches?: Application[]) { super(message); this.code = code; this.matches = matches; } }
export function localDate(now = new Date()) { return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; }
export function validDate(v: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false; const date = new Date(v+'T12:00:00Z'); return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === v && +v.slice(0,4) >= 1900; }
export function daysBetween(from: string, to: string) { return Math.round((Date.parse(to+'T12:00:00Z') - Date.parse(from+'T12:00:00Z')) / 86400000); }
export function formatDate(value: string) { if (!value) return '—'; return new Date(value+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); }
export function validateDraft(input: unknown): Draft {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AppError('Application data is missing.');
  const o = input as Record<string, unknown>; const out: Record<string,string> = {};
  for (const key of Object.keys(EMPTY_DRAFT)) {
    const raw = o[key] ?? ''; if (typeof raw !== 'string') throw new AppError(`${key} must be text.`);
    const value = key === 'notes' ? raw : raw.trim();
    if (value.length > (key==='notes'?20000:key==='postingUrl'?3000:500)) throw new AppError(`${key} is too long.`);
    out[key] = value;
  }
  if (!out.company || !out.jobTitle) throw new AppError('Company and job title are required.');
  out.status ||= 'Saved'; if (!(STATUSES as readonly string[]).includes(out.status)) throw new AppError('Choose a valid application status.');
  for (const key of ['applicationDate','deadline','followUpDate']) if (out[key] && !validDate(out[key])) throw new AppError(`${key} must be a real date in YYYY-MM-DD format.`);
  if (out.postingUrl) { try { const u = new URL(out.postingUrl); if (!['https:','http:'].includes(u.protocol) || u.username || u.password) throw new Error(); } catch { throw new AppError('Posting URL must start with https:// or http://.'); } }
  return out as Draft;
}
export function validateId(id: unknown): string { if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new AppError('Invalid application or history ID.'); return id; }
export function validateHistory(value: unknown): HistoryEvent[] {
  if (!Array.isArray(value) || value.length > 3000) throw new AppError('Activity history must be an array of up to 3,000 events.');
  const events = value.map((v: any) => {
    if (!v || typeof v !== 'object') throw new AppError('Invalid history event.');
    validateId(v.id);
    if (typeof v.timestamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v.timestamp) || !Number.isFinite(Date.parse(v.timestamp))) throw new AppError('History timestamps must include a timezone.');
    if (!['created','status_change','followed_up'].includes(v.type) || typeof v.detail !== 'string' || v.detail.length > 2000) throw new AppError('Invalid activity history.');
    return {id:v.id, timestamp:v.timestamp, type:v.type, detail:v.detail} as HistoryEvent;
  });
  return mergeHistory([], events);
}
export function mergeHistory(a: HistoryEvent[], b: HistoryEvent[]) {
  const events = new Map<string,HistoryEvent>();
  for (const e of [...a,...b]) { const old = events.get(e.id); if (old && (old.timestamp !== e.timestamp || old.type !== e.type || old.detail !== e.detail)) throw new AppError('A history event has the same ID but different content. Review the backup before importing.'); events.set(e.id,e); }
  return [...events.values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.id.localeCompare(b.id));
}
export function event(type: HistoryEvent['type'], detail: string): HistoryEvent { return {id:newId(), timestamp:new Date().toISOString(), type, detail}; }
export function newApplication(draft: Draft, id = newId()): Application { return {...validateDraft(draft),id:validateId(id),revision:1,updatedAt:new Date().toISOString(),activityHistory:[event('created','Application added')]}; }
export function updateApplication(old: Application, draft: Draft): Application { const clean=validateDraft(draft); return {...old,...clean,revision:old.revision+1,updatedAt:new Date().toISOString(),activityHistory:old.status===clean.status ? old.activityHistory : [...old.activityHistory,event('status_change',`${old.status} → ${clean.status}`)]}; }
export function followedUp(old: Application, date: string): Application { if (!validDate(date)) throw new AppError('A valid local date is required.'); return {...old,followUpDate:'',revision:old.revision+1,updatedAt:new Date().toISOString(),activityHistory:[...old.activityHistory,event('followed_up',`Followed up on ${date}`)]}; }
export function importedApplication(record: Application, old?: Application): Application {
  const clean=validateDraft(record); const history=validateHistory(record.activityHistory);
  return {...clean,id:validateId(record.id),revision:old ? old.revision+1 : 1,updatedAt:new Date().toISOString(),activityHistory:old ? mergeHistory(old.activityHistory,history) : history};
}
const tracking = new Set(['fbclid','gclid','dclid','msclkid','mc_cid','mc_eid','trk','trackingid']);
export function normalizedUrl(raw: string) {
  if (!raw) return ''; try { const u=new URL(raw); u.hostname=u.hostname.toLowerCase(); for (const k of [...u.searchParams.keys()]) if (k.toLowerCase().startsWith('utm_') || tracking.has(k.toLowerCase())) u.searchParams.delete(k); u.searchParams.sort(); return u.toString(); } catch { return ''; }
}
export function normalizeText(s: string) { return s.trim().toLowerCase().replace(/\s+/g,' '); }
function titleTokens(s:string) { return new Set(normalizeText(s).replace(/\badmin\b/g,'administrator').replace(/\bsysadmin\b/g,'systems administrator').replace(/\bsr\.?\b/g,'senior').replace(/\bjr\.?\b/g,'junior').split(/[^a-z0-9]+/).filter(Boolean)); }
export function duplicateReason(draft: Draft, existing: Draft) {
  const url=normalizedUrl(draft.postingUrl); if (url && url===normalizedUrl(existing.postingUrl)) return 'Same posting URL';
  if (normalizeText(draft.company)!==normalizeText(existing.company)) return '';
  if (normalizeText(draft.jobTitle)===normalizeText(existing.jobTitle)) return 'Same company and job title';
  const a=titleTokens(draft.jobTitle), b=titleTokens(existing.jobTitle); const common=[...a].filter(x=>b.has(x)).length;
  return common && common/new Set([...a,...b]).size >= .7 ? 'Similar title at the same company' : '';
}
export function duplicates(draft: Draft, records: Application[], excludeId?: string) { return records.filter(a=>a.id!==excludeId && duplicateReason(draft,a)); }
export type Alert = { key: string; app: Application; field: 'deadline'|'followUpDate'; label: string; days: number; date: string };
export function alertsFor(records: Application[], window: number, today=localDate()): Alert[] {
  const out: Alert[]=[];
  for(const app of records) {
    if (app.status==='Rejected'||app.status==='Withdrawn') continue;
    for(const field of ['deadline','followUpDate'] as const) {
      if (!app[field] || (field==='deadline'&&app.status!=='Saved')) continue;
      const days=daysBetween(today,app[field]); if(days>window) continue;
      out.push({key:`${app.id}-${field}`,app,field,date:app[field],days,label:days<0?'Overdue':days===0?'Due today':'Approaching'});
    }
  }
  return out.sort((a,b)=>a.days-b.days || a.app.company.localeCompare(b.app.company));
}
