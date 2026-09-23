import type { ClassifiedExecution } from "../../types";

const DB_NAME = "rta-report-analyzer-history";
const STORE = "operational-weeks";
const DB_VERSION = 1;

export type WeeklyHistory = {
  id: string;
  weekStart: string;
  weekEnd: string;
  updatedAt: number;
  imports: Array<{ importedAt:number; source:string; received:number; added:number; duplicates:number; minDate?:string; maxDate?:string }>;
  executions: ClassifiedExecution[];
};

function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:"id"});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function dateOf(row:ClassifiedExecution){return row.date ?? row.startedAt ?? row.finishedAt;}
function isoDay(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function operationalWeek(anchor:Date){const d=new Date(anchor);d.setHours(0,0,0,0);const day=d.getDay();const diff=day===0?-6:1-day;d.setDate(d.getDate()+diff);const end=new Date(d);end.setDate(end.getDate()+4);return {id:isoDay(d),start:isoDay(d),end:isoDay(end)};}
function range(rows:ClassifiedExecution[]){const dates=rows.map(dateOf).filter((x):x is Date=>x instanceof Date&&!Number.isNaN(x.getTime())).sort((a,b)=>a.getTime()-b.getTime());return {min:dates[0],max:dates.at(-1)};}
async function getWeek(id:string):Promise<WeeklyHistory|undefined>{const db=await openDb();return new Promise((resolve,reject)=>{const req=db.transaction(STORE,"readonly").objectStore(STORE).get(id);req.onsuccess=()=>resolve(req.result as WeeklyHistory|undefined);req.onerror=()=>reject(req.error);});}
async function putWeek(value:WeeklyHistory){const db=await openDb();return new Promise<void>((resolve,reject)=>{const req=db.transaction(STORE,"readwrite").objectStore(STORE).put(value);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error);});}
export async function listWeeks():Promise<WeeklyHistory[]>{const db=await openDb();return new Promise((resolve,reject)=>{const req=db.transaction(STORE,"readonly").objectStore(STORE).getAll();req.onsuccess=()=>resolve((req.result as WeeklyHistory[]).sort((a,b)=>b.weekStart.localeCompare(a.weekStart)));req.onerror=()=>reject(req.error);});}
export async function addToOperationalWeek(rows:ClassifiedExecution[],source:string){if(!rows.length)throw new Error("Nenhuma execução para adicionar.");const r=range(rows);const anchor=r.max??new Date();const w=operationalWeek(anchor);const current=await getWeek(w.id);const existing=new Map((current?.executions??[]).map(x=>[x.id,x]));let duplicates=0,added=0;for(const row of rows){if(existing.has(row.id)){duplicates++;continue;}existing.set(row.id,row);added++;}const history:WeeklyHistory={id:w.id,weekStart:w.start,weekEnd:w.end,updatedAt:Date.now(),imports:[...(current?.imports??[]),{importedAt:Date.now(),source,received:rows.length,added,duplicates,minDate:r.min?.toISOString(),maxDate:r.max?.toISOString()}],executions:[...existing.values()]};await putWeek(history);window.dispatchEvent(new Event("weekly-history-updated"));return {history,added,duplicates};}
export async function clearWeek(id:string){const db=await openDb();return new Promise<void>((resolve,reject)=>{const req=db.transaction(STORE,"readwrite").objectStore(STORE).delete(id);req.onsuccess=()=>{window.dispatchEvent(new Event("weekly-history-updated"));resolve();};req.onerror=()=>reject(req.error);});}
