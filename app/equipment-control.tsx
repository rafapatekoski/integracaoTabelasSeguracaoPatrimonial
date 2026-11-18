"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;
type Sector = Row & { id: string; name: string; availability_target: number; repair_target_hours: number };
type Category = Row & { id: string; name: string };
type Equipment = Row & { id: string; name: string; sector_id: string; category_id: string; active: boolean };
type Fault = Row & { id: string; name: string };
type Failure = Row & { id: string; equipment_id: string | null; fault_type_id: string | null; equipment: string; sector: string; category: string; failure: string; failed_at: string; returned_at: string | null; created_by: string | null; status: string };
type Profile = { id: string; display_name: string; role?: string };
type Subtab = "dashboard" | "catalogs" | "launches" | "results" | "reports" | "instructions";
type CatalogKind = "sectors" | "categories" | "equipment" | "faults";

const tabs: { id: Subtab; label: string }[] = [
  { id: "catalogs", label: "CADASTRO" },
  { id: "launches", label: "LANÇAMENTOS" },
  { id: "results", label: "RESULTADOS" },
  { id: "reports", label: "RELATÓRIOS" },
  { id: "dashboard", label: "DASHBOARD" },
  { id: "instructions", label: "INSTRUÇÕES" },
];
const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const colors = ["#2563eb","#f97316","#a1a1aa","#eab308","#60a5fa","#65a30d","#818cf8","#fb7185","#14b8a6","#c084fc"];
const tables: Record<CatalogKind,string> = { sectors:"equipment_sectors", categories:"equipment_categories", equipment:"equipment_registry", faults:"equipment_fault_types" };
const labels: Record<CatalogKind,string> = { sectors:"Setores", categories:"Categorias", equipment:"Equipamentos", faults:"Falhas" };
const card = "rounded-xl border border-white/10 bg-zinc-900/60 backdrop-blur-md";
const input = "w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-lime-300/50";
const button = "rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800 hover:text-white";
const primary = "rounded-lg bg-lime-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-200 disabled:opacity-60";
const hours = (r: Failure) => !r.failed_at ? 0 : Math.max(0, ((r.returned_at ? Date.parse(r.returned_at) : Date.now()) - Date.parse(r.failed_at)) / 3600000);
const duration = (h: number) => { const m=Math.round(Math.max(0,h)*60); const d=Math.floor(m/1440); const hr=Math.floor((m%1440)/60); const min=m%60; return (d ? d+"d " : "")+hr+"h "+String(min).padStart(2,"0")+"m"; };
const dateTimeLocal = (d = new Date()) => new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
const fmtDate = (value: string) => value ? new Date(value).toLocaleDateString("pt-BR") : "—";

function Donut({ title, values }: { title:string; values:{name:string;value:number}[] }) {
  const rows=values.filter(v=>v.value>0).slice(0,10), total=rows.reduce((s,v)=>s+v.value,0); let cursor=0;
  const slices=rows.map((r,i)=>{const start=cursor;cursor+=total?r.value/total*100:0;return colors[i%colors.length]+" "+start+"% "+cursor+"%";});
  return <section className={card+" p-4"}><h3 className="mb-4 text-sm font-medium text-zinc-100">{title}</h3>{total?<div className="flex flex-col items-center gap-4 sm:flex-row"><div className="relative size-32 shrink-0 rounded-full" style={{background:"conic-gradient("+slices.join(",")+")"}}><div className="absolute inset-[28%] grid place-items-center rounded-full bg-zinc-900 text-sm font-semibold">{total}</div></div><ul className="max-h-36 w-full space-y-1 overflow-auto">{rows.map((r,i)=><li key={r.name} className="flex gap-2 text-[10px]"><i className="mt-1 size-2 shrink-0 rounded-sm" style={{background:colors[i%colors.length]}}/><span className="min-w-0 flex-1 truncate text-zinc-400">{r.name}</span><b className="text-zinc-200">{Number(r.value.toFixed(1))}</b></li>)}</ul></div>:<div className="grid h-32 place-items-center text-xs text-zinc-500">Sem dados para este ano.</div>}</section>;
}
function Bar({ title, values, color }: { title:string; values:number[]; color:string }) {
  const max=Math.max(1,...values);
  return <section className={card+" p-4"}><h3 className="mb-4 text-sm font-medium text-zinc-100">{title}</h3><div className="flex h-36 items-end gap-1 border-b border-white/10">{values.map((v,i)=><div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className="truncate text-[8px] text-zinc-500">{v?duration(v):"0h"}</span><div title={duration(v)} className={"w-full rounded-t-sm "+color} style={{height:Math.max(v?Math.min(v/max*72,72):1,1)+"%"}}/><span className="mb-1 text-[8px] text-zinc-500">{months[i].slice(0,3)}</span></div>)}</div></section>;
}
function Status({ value }: { value:string }) {
  const late=value.toLowerCase().includes("atras");
  const open=value.toLowerCase().includes("andamento") || value.toLowerCase().includes("execução");
  return <span className={"rounded-md border px-2 py-1 text-[10px] "+(late?"border-rose-500/20 bg-rose-500/10 text-rose-300":open?"border-amber-500/20 bg-amber-500/10 text-amber-300":"border-emerald-500/20 bg-emerald-500/10 text-emerald-300")}>{value||"—"}</span>;
}
function Empty({ text }: {text:string}) { return <div className="px-5 py-12 text-center text-sm text-zinc-500">{text}</div>; }
function Ranking({title,rows,asDuration=false}:{title:string;rows:{name:string;value:number}[];asDuration?:boolean}) {
  return <section className={card+" p-4"}><h3 className="mb-3 text-sm font-medium">{title}</h3>{rows.length?<ol className="space-y-2">{rows.map((r,i)=><li key={r.name} className="flex items-center gap-3 text-xs"><span className="grid size-6 place-items-center rounded bg-zinc-800 text-[10px] text-zinc-500">{i+1}</span><span className="flex-1 truncate text-zinc-300">{r.name}</span><b>{asDuration?duration(r.value):r.value}</b></li>)}</ol>:<Empty text="Sem dados para o período."/>}</section>;
}
function FailuresTable({rows,authors,onReturn,onEdit}:{rows:Failure[];authors:Map<string,string>;onReturn:(id:string)=>void;onEdit:(row:Failure)=>void}) {
  const date = (v:string|null) => v ? new Date(v).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}) : "—";
  const target = (r:Failure) => { const v=String(r.repair_target??""); const m=v.match(/^(?:(\d+) days? )?(\d+):(\d+):(\d+)/); return m ? Number(m[1]||0)*24+Number(m[2])+Number(m[3])/60+Number(m[4])/3600 : null; };
  return <div className="overflow-x-auto"><table className="w-full min-w-[1500px] text-left text-xs"><thead className="bg-zinc-800/50 text-[10px] uppercase tracking-wide text-zinc-500"><tr>{["Equipamento","Categoria","Falha","Data e hora da falha","Data e hora do retorno","Tempo indisponível","Meta de reparo","Tempo excedido","Status","Observação","Preenchido por","Ações"].map(x=><th key={x} className="px-3 py-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{rows.map(r=>{const goal=target(r), elapsed=hours(r), status=r.returned_at ? "Concluído" : goal!==null && elapsed>goal ? "Atrasado" : "Em execução"; return <tr key={r.id} className="hover:bg-white/[.02]"><td className="px-3 py-3">{r.sector} · {r.equipment}</td><td className="px-3 py-3">{r.category||"—"}</td><td className="px-3 py-3">{r.failure||"—"}</td><td className="whitespace-nowrap px-3 py-3">{date(r.failed_at)}</td><td className="whitespace-nowrap px-3 py-3">{date(r.returned_at)}</td><td className="px-3 py-3">{duration(elapsed)}</td><td className="px-3 py-3">{goal===null?"—":duration(goal)}</td><td className="px-3 py-3">{goal===null?"—":duration(Math.max(0,elapsed-goal))}</td><td className="px-3 py-3"><Status value={status}/></td><td className="px-3 py-3">{r.observation||"—"}</td><td className="px-3 py-3"><span className="rounded-full bg-zinc-800 px-2 py-1 text-[10px]">{authors.get(r.created_by??"")??"Sem autoria"}</span></td><td className="flex gap-1 px-3 py-3">{!r.returned_at&&<button onClick={()=>onReturn(r.id)} className="rounded border border-lime-300/20 px-2 py-1.5 text-lime-200">Marcar retorno</button>}<button onClick={()=>onEdit(r)} className="rounded border border-white/10 px-2 py-1.5">Editar</button></td></tr>})}</tbody></table>{!rows.length&&<Empty text="Nenhum lançamento encontrado."/>}</div>;
}

export default function EquipmentControl({ userId, configured }: { userId: string | undefined; configured: boolean }) {
  const [tab,setTab]=useState<Subtab>("dashboard");
  const [catalogKind,setCatalogKind]=useState<CatalogKind>("sectors");
  const [year,setYear]=useState(new Date().getFullYear());
  const [search,setSearch]=useState("");
  const [db,setDb]=useState<{sectors:Sector[];categories:Category[];equipment:Equipment[];faults:Fault[];failures:Failure[];profiles:Profile[]}>({sectors:[],categories:[],equipment:[],faults:[],failures:[],profiles:[]});
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [refresh,setRefresh]=useState(0);
  const [formOpen,setFormOpen]=useState(false);
  const [editing,setEditing]=useState("");
  const [form,setForm]=useState({equipment_id:"",fault_type_id:"",failed_at:dateTimeLocal(),returned_at:"",observation:""});
  const [busy,setBusy]=useState(false);
  const [actionError,setActionError]=useState("");
  const [catalogForm,setCatalogForm]=useState<Record<string,string>>({});
  const [catalogEdit,setCatalogEdit]=useState("");
  const [catalogMessage,setCatalogMessage]=useState("");
  const [catalogError,setCatalogError]=useState("");
  const [catalogBusy,setCatalogBusy]=useState(false);
  const [limit,setLimit]=useState(50);
  const supabase=useMemo(()=>configured?createClient():null,[configured]);

  useEffect(()=>{
    if(!supabase||!userId){setDb({sectors:[],categories:[],equipment:[],faults:[],failures:[],profiles:[]});return;}
    const client=supabase; let cancelled=false;
    async function allRows(table:string,order="created_at"){
      const all:Row[]=[]; let start=0;
      while(true){const res=await client.from(table).select("*").order(order,{ascending:false,nullsFirst:false}).range(start,start+999);if(res.error)throw res.error;const batch=(res.data??[]) as Row[];all.push(...batch);if(batch.length<1000)return all;start+=1000;}
    }
    async function load(){
      setLoading(true);setError("");
      try{
        const [sectors,categories,equipment,faults,failures,profiles]=await Promise.all([
          allRows("equipment_sectors","name"),allRows("equipment_categories","name"),allRows("equipment_registry","name"),allRows("equipment_fault_types","name"),allRows("equipment_failures","failed_at"),client.from("profiles").select("id, display_name, role")
        ]);
        if(profiles.error)throw profiles.error;
        if(!cancelled)setDb({sectors:sectors as Sector[],categories:categories as Category[],equipment:equipment as Equipment[],faults:faults as Fault[],failures:failures as Failure[],profiles:(profiles.data??[]) as Profile[]});
      }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Erro ao consultar o banco. Aplique a migração do controle de equipamentos.");}
      finally{if(!cancelled)setLoading(false);}
    }
    load();return()=>{cancelled=true;};
  },[supabase,userId,refresh]);

  const role=db.profiles.find(p=>p.id===userId)?.role??"viewer";
  const canManage=role==="admin"||role==="supervisor";
  const authors=useMemo(()=>new Map(db.profiles.map(p=>[p.id,p.display_name||p.id.slice(0,8)])),[db.profiles]);
  const sectorsById=useMemo(()=>new Map(db.sectors.map(x=>[x.id,x.name])),[db.sectors]);
  const categoriesById=useMemo(()=>new Map(db.categories.map(x=>[x.id,x.name])),[db.categories]);
  const equipmentById=useMemo(()=>new Map(db.equipment.map(x=>[x.id,x])),[db.equipment]);
  const faultsById=useMemo(()=>new Map(db.faults.map(x=>[x.id,x.name])),[db.faults]);
  const yearFailures=useMemo(()=>db.failures.filter(r=>r.failed_at&&new Date(r.failed_at).getFullYear()===year),[db.failures,year]);
  const openFailures=db.failures.filter(r=>!r.returned_at);
  const failedKeys=new Set(openFailures.map(r=>r.equipment_id||r.equipment).filter(Boolean));
  const failedEquipment=db.equipment.filter(e=>e.active&&(failedKeys.has(e.id)||failedKeys.has(e.name))).length;
  const activeCount=db.equipment.filter(e=>e.active).length;
  const down=yearFailures.reduce((n,r)=>n+hours(r),0);
  const resolved=yearFailures.filter(r=>r.returned_at);
  const yearElapsed=Math.max(0,(Math.min(Date.now(),new Date(year+1,0,1).getTime())-new Date(year,0,1).getTime())/3600000);
  const mtbf=yearFailures.length?Math.max(0,activeCount*yearElapsed-down)/yearFailures.length:0;
  const mttr=resolved.length?resolved.reduce((n,r)=>n+hours(r),0)/resolved.length:0;
  const monthlyRows=months.map((_,i)=>yearFailures.filter(r=>new Date(r.failed_at).getMonth()===i));
  const monthlyDown=monthlyRows.map(rows=>rows.reduce((n,r)=>n+hours(r),0));
  const monthlyMtbf=monthlyRows.map((rows,i)=>{const elapsed=Math.max(0,(Math.min(Date.now(),new Date(year,i+1,1).getTime())-new Date(year,i,1).getTime())/3600000);return rows.length?Math.max(0,activeCount*elapsed-rows.reduce((n,r)=>n+hours(r),0))/rows.length:0;});
  const monthlyMttr=monthlyRows.map(rows=>{const done=rows.filter(r=>r.returned_at);return done.length?done.reduce((n,r)=>n+hours(r),0)/done.length:0;});
  const rankings=useMemo(()=>{
    const group=(key:(r:Failure)=>string, measure:(r:Failure)=>number=()=>1)=>{const map=new Map<string,number>();yearFailures.forEach(r=>{const k=key(r)||"Não informado";map.set(k,(map.get(k)??0)+measure(r));});return [...map].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,10);};
    const equipmentName=(r:Failure)=>r.equipment_id?equipmentById.get(r.equipment_id)?.name||r.equipment:r.equipment;
    const sectorName=(r:Failure)=>r.equipment_id?sectorsById.get(equipmentById.get(r.equipment_id)?.sector_id??"")||r.sector:r.sector;
    const categoryName=(r:Failure)=>r.equipment_id?categoriesById.get(equipmentById.get(r.equipment_id)?.category_id??"")||r.category:r.category;
    const faultName=(r:Failure)=>r.fault_type_id?faultsById.get(r.fault_type_id)||r.failure:r.failure;
    return {equipment:group(r=>equipmentName(r)+" · "+sectorName(r)),sectors:group(sectorName),faults:group(faultName),categories:group(categoryName),equipmentDown:group(equipmentName,hours),sectorDown:group(r=>r.sector,hours),faultCount:group(faultName),categoryDown:group(r=>r.category,hours)};
  },[yearFailures,equipmentById,sectorsById,categoriesById,faultsById]);
  const filteredFailures=useMemo(()=>db.failures.filter(r=>new Date(r.failed_at).getFullYear()===year&&(!search||[r.equipment,r.sector,r.category,r.failure,r.status,authors.get(r.created_by??"")].join(" ").toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>b.failed_at.localeCompare(a.failed_at)),[db.failures,year,search,authors]);
  const catalogRows:Row[]=catalogKind==="sectors"?db.sectors:catalogKind==="categories"?db.categories:catalogKind==="equipment"?db.equipment:db.faults;
  const visibleCatalogs=catalogRows.filter(r=>JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
  const selectedTab=tab;

  function resetCatalog(row?:Row){
    setCatalogEdit(row?.id??"");setCatalogMessage("");setCatalogError("");
    if(!row){setCatalogForm({});return;}
    const next:Record<string,string>={};["name","availability_target","repair_target_hours","sector_id","category_id","active"].forEach(k=>{if(row[k]!==undefined)next[k]=String(row[k]);});setCatalogForm(next);
  }
  async function saveCatalog(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!supabase)return;setCatalogBusy(true);setCatalogError("");setCatalogMessage("");
    const payload:Row={};Object.entries(catalogForm).forEach(([key,value])=>{if(value==="")return;payload[key]=["availability_target","repair_target_hours"].includes(key)?Number(value):key==="active"?value==="true":value;});
    const result=catalogEdit?await supabase.from(tables[catalogKind]).update(payload).eq("id",catalogEdit):await supabase.from(tables[catalogKind]).insert(payload);
    if(result.error)setCatalogError(result.error.message);else{setCatalogMessage("Cadastro salvo.");setCatalogForm({});setCatalogEdit("");setRefresh(n=>n+1);}
    setCatalogBusy(false);
  }
  async function deleteCatalog(id:string){
    if(!supabase||!window.confirm("Excluir este cadastro?"))return;
    const {error}=await supabase.from(tables[catalogKind]).delete().eq("id",id);
    if(error)setCatalogError(error.message);else{setCatalogMessage("Cadastro excluído.");setRefresh(n=>n+1);}
  }
  function openFailure(row?:Failure){
    setActionError("");setEditing(row?.id??"");
    setForm(row?{equipment_id:row.equipment_id??"",fault_type_id:row.fault_type_id??"",failed_at:dateTimeLocal(new Date(row.failed_at)),returned_at:row.returned_at?dateTimeLocal(new Date(row.returned_at)):"",observation:row.observation??""}:{equipment_id:"",fault_type_id:"",failed_at:dateTimeLocal(),returned_at:"",observation:""});
    setFormOpen(true);
  }
  async function saveFailure(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!supabase)return;setBusy(true);setActionError("");
    const payload={equipment_id:form.equipment_id,fault_type_id:form.fault_type_id,failed_at:new Date(form.failed_at).toISOString(),returned_at:form.returned_at?new Date(form.returned_at).toISOString():null,observation:form.observation||null};
    if(form.returned_at && new Date(form.returned_at)<new Date(form.failed_at)){setActionError("O retorno deve acontecer após a falha.");setBusy(false);return;}
    const result=editing?await supabase.from("equipment_failures").update(payload).eq("id",editing):await supabase.from("equipment_failures").insert(payload);
    if(result.error)setActionError(result.error.message);else{setFormOpen(false);setEditing("");setRefresh(n=>n+1);}
    setBusy(false);
  }
  async function markReturned(id:string){
    if(!supabase)return;const {error}=await supabase.from("equipment_failures").update({returned_at:new Date().toISOString()}).eq("id",id);if(error)setActionError(error.message);else setRefresh(n=>n+1);
  }
  function exportRows(rows=filteredFailures){
    const head=["Falha iniciou","Equipamento","Setor","Categoria","Falha","Retorno","Tempo parado","Status","Preenchido por"];
    const content=rows.map(r=>[r.failed_at,r.equipment,r.sector,r.category,r.failure,r.returned_at||"",duration(hours(r)),r.status||"",authors.get(r.created_by??"")||"—"]);
    const csv=[head,...content].map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(";")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"}));a.download="falhas-equipamentos-"+year+".csv";a.click();URL.revokeObjectURL(a.href);
  }
  const kpis=[
    ["Total de Equipamentos",activeCount,"ativos no cadastro"],
    ["Equipamentos Operantes",Math.max(0,activeCount-failedEquipment),"sem falha aberta"],
    ["Equipamentos com Falha",failedEquipment,"com ocorrência aberta"],
    ["Tempo total indisponível acumulado no ano",duration(down),String(year)],
    ["Tempo médio entre falhas acumulado no ano",duration(mtbf),String(year)],
    ["Tempo médio de reparo acumulado no ano",duration(mttr),String(year)],
  ];

  return <section className="min-w-0">
    <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-white/10 print:hidden">{tabs.map(item=><button key={item.id} onClick={()=>{setTab(item.id);setSearch("");setLimit(50);}} className={"shrink-0 border-b-2 px-3 py-3 text-[10px] font-semibold tracking-wide transition "+(tab===item.id?"border-lime-300 text-zinc-100":"border-transparent text-zinc-500 hover:text-white")}>{item.label}</button>)}</nav>
    {error&&<div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">Erro ao carregar o controle de equipamentos: {error}. Aplique a migração <code>202611170002_equipment_control.sql</code> no Supabase.</div>}
    {!configured&&<div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">Prévia de interface. Configure o Supabase para salvar cadastros e lançamentos.</div>}
    {loading&&<p className="mb-3 text-xs text-zinc-500">Atualizando dados…</p>}
    {actionError&&<p role="alert" className="mb-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">{actionError}</p>}

    {selectedTab==="dashboard"&&<>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-medium tracking-tight">Falhas e disponibilidade</h2><p className="mt-1 text-xs text-zinc-500">Indicadores calculados dos lançamentos no Supabase.</p></div><label className="text-xs text-zinc-500">Ano<select value={year} onChange={e=>setYear(Number(e.target.value))} className={input+" mt-1 w-28"}>{Array.from({length:7},(_,i)=>new Date().getFullYear()-3+i).map(y=><option key={y}>{y}</option>)}</select></label></div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">{kpis.map(([name,value,note],i)=><article key={name} className={card+" p-4"}><p className="min-h-8 text-xs leading-relaxed text-zinc-400">{name}</p><p className={"mt-3 truncate text-xl font-semibold tracking-tight "+(i===2&&failedEquipment?"text-rose-300":"text-zinc-100")}>{value}</p><p className="mt-1 text-[10px] text-zinc-600">{note}</p></article>)}</div>
      <div className="grid gap-4 2xl:grid-cols-[1.7fr_1fr]"><div className="grid gap-4 lg:grid-cols-2"><Donut title="Top 10 equipamentos com mais falhas" values={rankings.equipment}/><Donut title="Top 10 setores com mais falhas" values={rankings.sectors}/><Donut title="Top 10 falhas mais frequentes" values={rankings.faults}/><Donut title="Top 10 categorias com mais falhas" values={rankings.categories}/></div><div className="grid gap-4"><Bar title="Tempo total indisponível" values={monthlyDown} color="bg-rose-500"/><Bar title="Tempo médio entre falhas" values={monthlyMtbf} color="bg-orange-500"/><Bar title="Tempo médio de reparo" values={monthlyMttr} color="bg-blue-500"/></div></div>
      <section className={card+" mt-4 overflow-hidden"}><div className="border-b border-white/10 px-4 py-3"><h3 className="text-sm font-medium">Lançamentos recentes</h3></div><FailuresTable rows={[...db.failures].sort((a,b)=>b.failed_at.localeCompare(a.failed_at)).slice(0,6)} authors={authors} onReturn={markReturned} onEdit={openFailure}/></section>
    </>}

    {selectedTab==="catalogs"&&<div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <aside className={card+" p-3"}><p className="px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-500">Cadastros</p>{(Object.keys(labels) as CatalogKind[]).map(k=><button key={k} onClick={()=>{setCatalogKind(k);resetCatalog();setSearch("");}} className={"mb-1 flex w-full justify-between rounded-lg px-3 py-2.5 text-left text-sm "+(catalogKind===k?"bg-blue-600/20 text-white":"text-zinc-400 hover:bg-zinc-800")}>{labels[k]}<span className="text-xs text-zinc-500">{k==="sectors"?db.sectors.length:k==="categories"?db.categories.length:k==="equipment"?db.equipment.length:db.faults.length}</span></button>)}</aside>
      <section className={card+" overflow-hidden"}><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4"><div><h2 className="font-medium">{labels[catalogKind]}</h2><p className="mt-1 text-xs text-zinc-500">{canManage?"Gerencie a base usada nos lançamentos.":"Seu perfil precisa ser supervisor ou administrador para cadastrar."}</p></div><div className="flex gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} className={input+" w-40 py-2"} placeholder="Buscar..."/>{canManage&&<button onClick={()=>resetCatalog()} className={primary}>+ Novo</button>}</div></div>
        {canManage&&<form onSubmit={saveCatalog} className="grid gap-3 border-b border-white/10 bg-zinc-950/40 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-[11px] text-zinc-400">Nome<input required value={catalogForm.name??""} onChange={e=>setCatalogForm({...catalogForm,name:e.target.value})} className={input+" mt-1"} placeholder={catalogKind==="equipment"?"Ex.: CAM_001":"Nome"}/></label>
          {catalogKind==="sectors"&&<><label className="text-[11px] text-zinc-400">Meta disponibilidade (%)<input type="number" min="0" max="100" step=".01" value={catalogForm.availability_target?String(Number(catalogForm.availability_target)*100):""} onChange={e=>setCatalogForm({...catalogForm,availability_target:String(Number(e.target.value)/100)})} className={input+" mt-1"} placeholder="99,9"/></label><label className="text-[11px] text-zinc-400">Meta de reparo (horas)<input required type="number" min="0" step=".5" value={catalogForm.repair_target_hours??""} onChange={e=>setCatalogForm({...catalogForm,repair_target_hours:e.target.value})} className={input+" mt-1"} placeholder="96"/></label></>}
          {catalogKind==="equipment"&&<><label className="text-[11px] text-zinc-400">Setor<select required value={catalogForm.sector_id??""} onChange={e=>setCatalogForm({...catalogForm,sector_id:e.target.value})} className={input+" mt-1"}><option value="">Selecione</option>{db.sectors.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="text-[11px] text-zinc-400">Categoria<select required value={catalogForm.category_id??""} onChange={e=>setCatalogForm({...catalogForm,category_id:e.target.value})} className={input+" mt-1"}><option value="">Selecione</option>{db.categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label></>}
          {catalogError&&<p className="text-xs text-rose-300 sm:col-span-4">{catalogError}</p>}{catalogMessage&&<p className="text-xs text-emerald-300 sm:col-span-4">{catalogMessage}</p>}<div className="flex items-end gap-2"><button disabled={catalogBusy} className={primary}>{catalogBusy?"Salvando…":catalogEdit?"Atualizar":"Salvar"}</button>{catalogEdit&&<button type="button" onClick={()=>resetCatalog()} className={button}>Cancelar</button>}</div>
        </form>}
        <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-zinc-800/50 text-zinc-400"><tr><th className="px-4 py-3">Nome</th>{catalogKind==="equipment"&&<><th className="px-4 py-3">Setor</th><th className="px-4 py-3">Categoria</th></>}{catalogKind==="sectors"&&<><th className="px-4 py-3">Meta disponibilidade</th><th className="px-4 py-3">Meta reparo</th></>}{canManage&&<th className="px-4 py-3">Ações</th>}</tr></thead><tbody className="divide-y divide-white/5">{visibleCatalogs.map(row=><tr key={row.id} className="hover:bg-white/[.02]"><td className="px-4 py-3 text-zinc-200">{row.name}</td>{catalogKind==="equipment"&&<><td className="px-4 py-3 text-zinc-400">{sectorsById.get(row.sector_id)||"—"}</td><td className="px-4 py-3 text-zinc-400">{categoriesById.get(row.category_id)||"—"}</td></>}{catalogKind==="sectors"&&<><td className="px-4 py-3 text-zinc-400">{(Number(row.availability_target)*100).toFixed(2)}%</td><td className="px-4 py-3 text-zinc-400">{row.repair_target_hours}h</td></>}{canManage&&<td className="flex gap-2 px-4 py-3"><button onClick={()=>resetCatalog(row)} className={button}>Editar</button><button onClick={()=>deleteCatalog(row.id)} className="rounded-lg border border-rose-500/20 px-3 py-2 text-[10px] text-rose-300">Excluir</button></td>}</tr>)}</tbody></table>{!visibleCatalogs.length&&<Empty text="Nenhum cadastro. Comece adicionando Setores e Categorias."/>}</div>
      </section>
    </div>}

    {selectedTab==="launches"&&<section className={card+" overflow-hidden"}><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4"><div><h2 className="text-sm font-medium">Registro de falhas</h2><p className="mt-1 text-xs text-zinc-500">{filteredFailures.length} ocorrência(s) em {year}</p></div><div className="flex gap-2"><input value={search} onChange={e=>{setSearch(e.target.value);setLimit(50);}} className={input+" w-56 py-2"} placeholder="Buscar equipamento, setor, falha..."/><button onClick={()=>openFailure()} className={primary}>+ Novo lançamento</button><button onClick={()=>exportRows()} className={button}>Exportar</button></div></div><FailuresTable rows={filteredFailures.slice(0,limit)} authors={authors} onReturn={markReturned} onEdit={openFailure}/>{filteredFailures.length>limit&&<button className={"m-4 "+button} onClick={()=>setLimit(n=>n+50)}>Carregar mais {filteredFailures.length-limit}</button>}</section>}

    {selectedTab==="results"&&<div className="space-y-4"><div className="flex items-end justify-between"><div><h2 className="text-xl font-medium">Resultados por período</h2><p className="mt-1 text-xs text-zinc-500">Indicadores de falhas, metas e indisponibilidade.</p></div><select value={year} onChange={e=>setYear(Number(e.target.value))} className={input+" w-28"}>{Array.from({length:7},(_,i)=>new Date().getFullYear()-3+i).map(y=><option key={y}>{y}</option>)}</select></div><div className="grid gap-4 lg:grid-cols-2"><Ranking title="Top 10 falhas mais frequentes" rows={rankings.faults}/><Ranking title="Top 10 equipamentos com mais falhas" rows={rankings.equipment}/><Ranking title="Top 10 setores com mais falhas" rows={rankings.sectors}/><Ranking title="Top 10 categorias com mais falhas" rows={rankings.categories}/><Ranking title="Equipamentos com mais horas paradas" rows={rankings.equipmentDown} asDuration/><Ranking title="Setores com mais horas paradas" rows={rankings.sectorDown} asDuration/></div><section className={card+" overflow-x-auto p-4"}><h3 className="mb-3 text-sm font-medium">Resumo mensal · {year}</h3><table className="w-full min-w-[650px] text-left text-xs"><thead className="text-zinc-500"><tr>{["Mês","Falhas","Indisponibilidade","MTBF","MTTR"].map(x=><th key={x} className="p-2">{x}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{months.map((m,i)=><tr key={m}><td className="p-2">{m}</td><td className="p-2">{monthlyRows[i].length}</td><td className="p-2">{duration(monthlyDown[i])}</td><td className="p-2">{duration(monthlyMtbf[i])}</td><td className="p-2">{duration(monthlyMttr[i])}</td></tr>)}</tbody></table></section></div>}

    {selectedTab==="reports"&&<div className="space-y-4"><section className={card+" p-5"}><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-widest text-lime-300">Relatório operacional</p><h2 className="mt-1 text-xl font-medium">Falhas e disponibilidade · {year}</h2><p className="mt-1 text-xs text-zinc-500">Atualizado em {new Date().toLocaleString("pt-BR")}</p></div><div className="flex gap-2 print:hidden"><button onClick={()=>exportRows(yearFailures)} className={button}>Exportar CSV</button><button onClick={()=>window.print()} className={primary}>Imprimir / Salvar PDF</button></div></div><div className="grid gap-3 sm:grid-cols-3">{[["Equipamentos",activeCount],["Falhas registradas",yearFailures.length],["Tempo indisponível",duration(down)]].map(([l,v])=><div key={String(l)} className="rounded-lg border border-white/10 bg-zinc-950 p-4"><p className="text-xs text-zinc-500">{l}</p><p className="mt-2 font-semibold">{v}</p></div>)}</div></section><div className="grid gap-4 lg:grid-cols-2"><Bar title="Tempo total indisponível" values={monthlyDown} color="bg-rose-500"/><Bar title="Tempo médio entre falhas" values={monthlyMtbf} color="bg-orange-500"/><Ranking title="Top 10 falhas" rows={rankings.faults}/><Ranking title="Top 10 equipamentos por indisponibilidade" rows={rankings.equipmentDown} asDuration/><Ranking title="Top setores por falhas" rows={rankings.sectors}/><Ranking title="Top categorias" rows={rankings.categories}/></div></div>}

    {selectedTab==="instructions"&&<div className="grid gap-4 lg:grid-cols-2">{[["1 · Cadastros","Cadastre setores e suas metas de disponibilidade/reparo. Depois cadastre categorias, equipamentos vinculados ao setor e à categoria, e tipos de falha."],["2 · Lançamentos","Escolha o equipamento, o tipo de falha e o horário de início. Setor, categoria, meta de reparo, duração e status são calculados pelo sistema."],["3 · Retorno","Quando o equipamento voltar, use Marcar retorno. O tempo parado e o status são recalculados e a autoria fica no histórico."],["4 · Indicadores","Dashboard, Resultados e Relatórios acompanham o ano selecionado. Os relatórios podem ser impressos ou salvos como PDF."],["Permissões","Operadores registram ocorrências. Supervisores e administradores gerenciam cadastros. A autoria vem da sessão Supabase."],["Primeiro acesso","Execute a migration do módulo e comece por Setores e Categorias. Depois cadastre os equipamentos e falhas. Não há dados reais importados do Excel."]].map(([h,p])=><article key={h} className={card+" p-5"}><h3 className="font-medium">{h}</h3><p className="mt-2 text-sm leading-relaxed text-zinc-400">{p}</p></article>)}</div>}

    {formOpen&&<div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"><form onSubmit={saveFailure} className={card+" my-auto w-full max-w-xl p-5 sm:p-7"}><div className="mb-5 flex items-start justify-between"><div><h2 className="text-xl font-medium">{editing?"Editar lançamento":"Novo lançamento"}</h2><p className="mt-1 text-xs text-zinc-500">Sua conta será registrada como autora.</p></div><button type="button" onClick={()=>setFormOpen(false)} className={button}>Fechar</button></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs text-zinc-400">Equipamento<select required value={form.equipment_id} onChange={e=>setForm({...form,equipment_id:e.target.value})} className={input+" mt-2"}><option value="">Selecione</option>{db.equipment.map(x=><option key={x.id} value={x.id}>{x.name} · {sectorsById.get(x.sector_id)}</option>)}</select></label><label className="text-xs text-zinc-400">Tipo de falha<select required value={form.fault_type_id} onChange={e=>setForm({...form,fault_type_id:e.target.value})} className={input+" mt-2"}><option value="">Selecione</option>{db.faults.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="text-xs text-zinc-400 sm:col-span-2">Data e hora<input required type="datetime-local" value={form.failed_at} onChange={e=>setForm({...form,failed_at:e.target.value})} className={input+" mt-2"}/></label><label className="text-xs text-zinc-400 sm:col-span-2">Data e hora do retorno (opcional)<input type="datetime-local" value={form.returned_at} onChange={e=>setForm({...form,returned_at:e.target.value})} className={input+" mt-2"}/></label><label className="text-xs text-zinc-400 sm:col-span-2">Observação<textarea rows={3} value={form.observation} onChange={e=>setForm({...form,observation:e.target.value})} className={input+" mt-2"}/></label></div>{actionError&&<p className="mt-3 text-xs text-rose-300">{actionError}</p>}<button disabled={busy} className={primary+" mt-5 w-full"}>{busy?"Salvando…":editing?"Salvar alterações":"Salvar lançamento"}</button></form></div>}
  </section>;
}
