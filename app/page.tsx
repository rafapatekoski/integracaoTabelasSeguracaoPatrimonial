"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type AnyRow = Record<string, any>;
type Sector = AnyRow & { id: string; name: string; availability_target: number; repair_target_hours: number };
type Category = AnyRow & { id: string; name: string };
type Equipment = AnyRow & { id: string; name: string; sector_id: string; category_id: string; active: boolean };
type FaultType = AnyRow & { id: string; name: string };
type Failure = AnyRow & { id: string; equipment_id: string | null; fault_type_id: string | null; equipment: string; sector: string; category: string; failure: string; failed_at: string; returned_at: string | null; created_by: string | null };
type Profile = { id: string; display_name: string; role?: string };
type Screen = "dashboard" | "launches" | "results" | "reports" | "instructions" | "catalogs";
type CatalogKind = "sectors" | "categories" | "equipment" | "faults";

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const palette = ["#2563eb", "#f97316", "#a1a1aa", "#eab308", "#60a5fa", "#65a30d", "#818cf8", "#fb7185", "#14b8a6", "#c084fc"];
const catalogTables: Record<CatalogKind, string> = { sectors: "equipment_sectors", categories: "equipment_categories", equipment: "equipment_registry", faults: "equipment_fault_types" };
const catalogLabels: Record<CatalogKind, string> = { sectors: "Setores", categories: "Categorias", equipment: "Equipamentos", faults: "Falhas" };
const fmtDate = (value?: string | null) => value ? new Date(value).toLocaleDateString("pt-BR") : "—";
const fmtNumber = (value: number, digits = 0) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
const fmtDuration = (hours: number) => {
  if (!Number.isFinite(hours) || hours <= 0) return "0h";
  const total = Math.round(hours * 60);
  const days = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  return (days ? days + "d " : "") + h + "h " + String(m).padStart(2, "0") + "m";
};
const dateInputValue = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const durationHours = (row: Failure) => {
  if (!row.failed_at) return 0;
  const end = row.returned_at ? new Date(row.returned_at) : new Date();
  return Math.max(0, (end.getTime() - new Date(row.failed_at).getTime()) / 3600000);
};
const card = "rounded-xl border border-white/10 bg-zinc-900/70 shadow-sm";
const fieldClass = "w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-lime-300/50";
const btn = "rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white";
const primaryBtn = "rounded-lg bg-lime-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-200 disabled:opacity-50";

function DonutCard({ title, rows }: { title: string; rows: { name: string; value: number }[] }) {
  const top = rows.filter((x) => x.value > 0).slice(0, 10);
  const total = top.reduce((sum, x) => sum + x.value, 0);
  let cursor = 0;
  const stops = top.map((item, i) => {
    const from = cursor;
    cursor += total ? item.value / total * 100 : 0;
    return palette[i % palette.length] + " " + from + "% " + cursor + "%";
  });
  return <section className={card + " p-4"}>
    <h3 className="mb-4 text-sm font-medium text-zinc-100">{title}</h3>
    {total ? <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative size-36 shrink-0 rounded-full" style={{ background: "conic-gradient(" + stops.join(",") + ")" }}><div className="absolute inset-[28%] grid place-items-center rounded-full bg-zinc-900 text-center"><span className="text-lg font-semibold text-zinc-100">{fmtNumber(total)}</span></div></div>
      <ul className="max-h-40 w-full space-y-1.5 overflow-auto">{top.map((item, i) => <li key={item.name} className="flex items-start gap-2 text-[11px]"><span className="mt-1 size-2 shrink-0 rounded-sm" style={{ backgroundColor: palette[i % palette.length] }}/><span className="min-w-0 flex-1 truncate text-zinc-400" title={item.name}>{item.name}</span><span className="font-medium text-zinc-200">{fmtNumber(item.value)}</span></li>)}</ul>
    </div> : <div className="grid h-36 place-items-center text-xs text-zinc-500">Sem dados para este período.</div>}
  </section>;
}

function MonthlyChart({ title, values, tone }: { title: string; values: number[]; tone: string }) {
  const max = Math.max(...values, 1);
  return <section className={card + " p-4"}>
    <h3 className="mb-4 text-sm font-medium text-zinc-100">{title}</h3>
    <div className="flex h-40 items-end gap-1.5 border-b border-white/10 px-1">
      {values.map((value, i) => <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
        <span className="max-w-full truncate text-[9px] text-zinc-500">{value ? fmtDuration(value) : "0h"}</span>
        <div className={"w-full min-h-[2px] rounded-t-sm " + tone} style={{ height: Math.max(value ? value / max * 72 : 1, 1) + "%" }} title={fmtDuration(value)}/>
        <span className="mb-1 text-[9px] text-zinc-500">{monthNames[i].slice(0, 3)}</span>
      </div>)}
    </div>
  </section>;
}

function StatusBadge({ value }: { value: string }) {
  const isLate = value.toLowerCase().includes("atraso") || value.toLowerCase().includes("atrasado");
  const isOpen = value.toLowerCase().includes("andamento");
  return <span className={"inline-flex rounded-md border px-2 py-1 text-[10px] font-medium " + (isLate ? "border-rose-500/20 bg-rose-500/10 text-rose-300" : isOpen ? "border-amber-500/20 bg-amber-500/10 text-amber-300" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300")}>{value || "—"}</span>;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [catalogKind, setCatalogKind] = useState<CatalogKind>("sectors");
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [authUser, setAuthUser] = useState<{ id: string; email?: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [data, setData] = useState<{ sectors: Sector[]; categories: Category[]; equipment: Equipment[]; faults: FaultType[]; failures: Failure[]; profiles: Profile[] }>({ sectors: [], categories: [], equipment: [], faults: [], failures: [], profiles: [] });
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [reload, setReload] = useState(0);
  const [showFailureForm, setShowFailureForm] = useState(false);
  const [editingFailureId, setEditingFailureId] = useState("");
  const [failureForm, setFailureForm] = useState({ equipment_id: "", fault_type_id: "", failed_at: dateInputValue(), observation: "" });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [catalogForm, setCatalogForm] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState("");
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [catalogMessage, setCatalogMessage] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [visibleRows, setVisibleRows] = useState(50);
  const hasConfig = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const supabase = useMemo(() => hasConfig ? createClient() : null, [hasConfig]);

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    let mounted = true;
    if (window.location.hash.includes("type=recovery")) setPasswordRecovery(true);
    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (mounted) { setAuthUser(sessionData.session?.user ? { id: sessionData.session.user.id, email: sessionData.session.user.email } : null); setAuthReady(true); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted && event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      if (mounted) setAuthUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !authUser) { setData({ sectors: [], categories: [], equipment: [], faults: [], failures: [], profiles: [] }); return; }
    const client = supabase;
    let cancelled = false;
    async function allRows(table: string, orderColumn = "created_at") {
      const result: AnyRow[] = [];
      let start = 0;
      while (true) {
        const response = await client.from(table).select("*").order(orderColumn, { ascending: false, nullsFirst: false }).range(start, start + 999);
        if (response.error) throw response.error;
        const batch = (response.data ?? []) as AnyRow[];
        result.push(...batch);
        if (batch.length < 1000) return result;
        start += 1000;
      }
    }
    async function load() {
      setDataLoading(true); setDataError("");
      try {
        const [sectors, categories, equipment, faults, failures, profilesResult] = await Promise.all([
          allRows("equipment_sectors", "name"), allRows("equipment_categories", "name"),
          allRows("equipment_registry", "name"), allRows("equipment_fault_types", "name"),
          allRows("equipment_failures", "failed_at"), client.from("profiles").select("id, display_name, role"),
        ]);
        if (profilesResult.error) throw profilesResult.error;
        if (!cancelled) setData({ sectors: sectors as Sector[], categories: categories as Category[], equipment: equipment as Equipment[], faults: faults as FaultType[], failures: failures as Failure[], profiles: (profilesResult.data ?? []) as Profile[] });
      } catch (error) {
        if (!cancelled) setDataError(error instanceof Error ? error.message : "Não foi possível carregar os dados. Confira se a migração do módulo está aplicada.");
      } finally { if (!cancelled) setDataLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [supabase, authUser, reload]);

  const role = data.profiles.find((p) => p.id === authUser?.id)?.role ?? "viewer";
  const canManageCatalog = role === "admin" || role === "supervisor";
  const equipmentById = useMemo(() => new Map(data.equipment.map((x) => [x.id, x])), [data.equipment]);
  const sectorById = useMemo(() => new Map(data.sectors.map((x) => [x.id, x.name])), [data.sectors]);
  const categoryById = useMemo(() => new Map(data.categories.map((x) => [x.id, x.name])), [data.categories]);
  const faultById = useMemo(() => new Map(data.faults.map((x) => [x.id, x.name])), [data.faults]);
  const authorById = useMemo(() => new Map(data.profiles.map((x) => [x.id, x.display_name || x.id.slice(0, 8)])), [data.profiles]);
  const yearFailures = useMemo(() => data.failures.filter((row) => new Date(row.failed_at).getFullYear() === year), [data.failures, year]);
  const openFailures = data.failures.filter((x) => !x.returned_at);
  const failedEquipmentKeys = new Set(openFailures.map((row) => row.equipment_id || row.equipment).filter(Boolean));
  const activeEquipmentCount = data.equipment.filter((item) => item.active).length;
  const failedEquipmentCount = data.equipment.filter((item) => item.active && (failedEquipmentKeys.has(item.id) || failedEquipmentKeys.has(item.name))).length;
  const downtimeYear = yearFailures.reduce((sum, row) => sum + durationHours(row), 0);
  const resolvedYear = yearFailures.filter((row) => row.returned_at);
  const yearStart = new Date(year, 0, 1);
  const elapsedYearHours = Math.max(0, (Math.min(Date.now(), new Date(year + 1, 0, 1).getTime()) - yearStart.getTime()) / 3600000);
  const mtbf = yearFailures.length ? Math.max(0, data.equipment.length * elapsedYearHours - downtimeYear) / yearFailures.length : 0;
  const mttr = resolvedYear.length ? resolvedYear.reduce((sum, row) => sum + durationHours(row), 0) / resolvedYear.length : 0;
  const monthlyDowntime = monthNames.map((_, month) => yearFailures.filter((x) => new Date(x.failed_at).getMonth() === month).reduce((sum, row) => sum + durationHours(row), 0));
  const monthlyIncidents = monthNames.map((_, month) => yearFailures.filter((x) => new Date(x.failed_at).getMonth() === month));
  const monthlyMtbf = monthlyIncidents.map((rows, month) => {
    const start = new Date(year, month, 1).getTime();
    const end = Math.min(Date.now(), new Date(year, month + 1, 1).getTime());
    const hrs = Math.max(0, (end - start) / 3600000);
    return rows.length ? Math.max(0, data.equipment.length * hrs - rows.reduce((n, r) => n + durationHours(r), 0)) / rows.length : 0;
  });
  const monthlyMttr = monthlyIncidents.map((rows) => {
    const done = rows.filter((r) => r.returned_at);
    return done.length ? done.reduce((n, r) => n + durationHours(r), 0) / done.length : 0;
  });
  const rankings = useMemo(() => {
    const count = (key: (row: Failure) => string, measure: (row: Failure) => number = () => 1) => {
      const map = new Map<string, number>();
      yearFailures.forEach((row) => { const name = key(row) || "Não informado"; map.set(name, (map.get(name) ?? 0) + measure(row)); });
      return [...map].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    };
    return {
      equipment: count((r) => r.equipment_id ? ((equipmentById.get(r.equipment_id)?.name ?? r.equipment) + " · " + (sectorById.get(equipmentById.get(r.equipment_id)?.sector_id ?? "") ?? r.sector)) : r.equipment),
      sectors: count((r) => r.equipment_id ? sectorById.get(equipmentById.get(r.equipment_id)?.sector_id ?? "") ?? r.sector : r.sector),
      faults: count((r) => r.fault_type_id ? faultById.get(r.fault_type_id) ?? r.failure : r.failure),
      categories: count((r) => r.equipment_id ? categoryById.get(equipmentById.get(r.equipment_id)?.category_id ?? "") ?? r.category : r.category),
      equipmentDowntime: count((r) => r.equipment, durationHours),
      sectorDowntime: count((r) => r.sector, durationHours),
      faultCount: count((r) => r.failure),
      categoryDowntime: count((r) => r.category, durationHours),
    };
  }, [yearFailures, equipmentById, sectorById, categoryById, faultById]);

  const currentRows = useMemo(() => data.failures.filter((row) => {
    const needle = search.toLowerCase();
    return (!needle || [row.equipment, row.sector, row.category, row.failure, row.status, authorById.get(row.created_by ?? "")].join(" ").toLowerCase().includes(needle))
      && new Date(row.failed_at).getFullYear() === year;
  }).sort((a, b) => b.failed_at.localeCompare(a.failed_at)), [data.failures, search, year, authorById]);

  const refresh = () => setReload((n) => n + 1);
  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoginError(""); setLoginBusy(true);
    if (!supabase) { setLoginError("Configure as chaves do Supabase no ambiente."); setLoginBusy(false); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) setLoginError(error.message); else setLoginPassword("");
    setLoginBusy(false);
  }
  async function handlePasswordRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setRecoveryError("");
    if (!supabase) { setRecoveryError("Supabase não configurado."); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setRecoveryError(error.message);
    else { setRecoveryMessage("Senha alterada. Entre com a nova senha."); setPasswordRecovery(false); window.history.replaceState(null, "", window.location.pathname); }
  }
  async function requestRecovery() {
    setLoginError(""); setRecoveryMessage("");
    if (!supabase || !loginEmail) { setLoginError("Informe seu e-mail para receber o link."); return; }
    setLoginBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, { redirectTo: window.location.origin });
    if (error) setLoginError(error.message); else setRecoveryMessage("Se o e-mail estiver cadastrado, você receberá um link de recuperação.");
    setLoginBusy(false);
  }
  async function createFailure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setActionError("");
    if (!supabase) return;
    setSaving(true);
    const payload = {
      equipment_id: failureForm.equipment_id,
      fault_type_id: failureForm.fault_type_id,
      failed_at: new Date(failureForm.failed_at).toISOString(),
      observation: failureForm.observation || null,
    };
    const result = editingFailureId
      ? await supabase.from("equipment_failures").update(payload).eq("id", editingFailureId)
      : await supabase.from("equipment_failures").insert(payload);
    const { error } = result;
    if (error) setActionError(error.message);
    else { setShowFailureForm(false); setEditingFailureId(""); setFailureForm({ equipment_id: "", fault_type_id: "", failed_at: dateInputValue(), observation: "" }); refresh(); }
    setSaving(false);
  }
  function editFailure(row: Failure) {
    setEditingFailureId(row.id);
    setFailureForm({ equipment_id: row.equipment_id ?? "", fault_type_id: row.fault_type_id ?? "", failed_at: dateInputValue(new Date(row.failed_at)), observation: row.observation ?? "" });
    setActionError(""); setShowFailureForm(true);
  }
  async function resolveFailure(id: string) {
    if (!supabase) return;
    setActionError("");
    const { error } = await supabase.from("equipment_failures").update({ returned_at: new Date().toISOString() }).eq("id", id);
    if (error) setActionError(error.message); else refresh();
  }
  function editCatalog(row?: AnyRow) {
    setEditingId(row?.id ?? "");
    if (!row) { setCatalogForm({}); setCatalogMessage(""); setCatalogError(""); return; }
    const form: Record<string, string> = {};
    Object.entries(row).forEach(([key, value]) => { if (["name", "availability_target", "repair_target_hours", "sector_id", "category_id", "active"].includes(key)) form[key] = String(value ?? ""); });
    setCatalogForm(form); setCatalogMessage(""); setCatalogError("");
  }
  async function saveCatalog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase) return;
    setCatalogBusy(true); setCatalogError(""); setCatalogMessage("");
    const payload: AnyRow = {};
    Object.entries(catalogForm).forEach(([key, value]) => {
      if (value === "") return;
      payload[key] = ["availability_target", "repair_target_hours"].includes(key) ? Number(value) : key === "active" ? value === "true" : value;
    });
    const query = editingId
      ? supabase.from(catalogTables[catalogKind]).update(payload).eq("id", editingId)
      : supabase.from(catalogTables[catalogKind]).insert(payload);
    const { error } = await query;
    if (error) setCatalogError(error.message);
    else { setCatalogMessage("Cadastro salvo."); setCatalogForm({}); setEditingId(""); refresh(); }
    setCatalogBusy(false);
  }
  async function deleteCatalog(id: string) {
    if (!supabase) return;
    if (!window.confirm("Excluir este item do cadastro?")) return;
    const { error } = await supabase.from(catalogTables[catalogKind]).delete().eq("id", id);
    if (error) setCatalogError(error.message); else { setCatalogMessage("Cadastro excluído."); refresh(); }
  }
  async function signOut() { await supabase?.auth.signOut(); }

  function exportCsv(rows = currentRows) {
    const headers = ["Data da falha", "Equipamento", "Setor", "Categoria", "Falha", "Retorno", "Indisponibilidade", "Status", "Preenchido por"];
    const body = rows.map((r) => [r.failed_at, r.equipment, r.sector, r.category, r.failure, r.returned_at ?? "", fmtDuration(durationHours(r)), r.status ?? "", authorById.get(r.created_by ?? "") ?? "—"]);
    const csv = [headers, ...body].map((row) => row.map((x) => '"' + String(x ?? "").replace(/"/g, '""') + '"').join(";")).join("\n");
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    anchor.download = "controle-equipamentos-" + year + ".csv"; anchor.click(); URL.revokeObjectURL(anchor.href);
  }

  if (hasConfig && !authReady) return <main className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-300">Verificando acesso…</main>;
  if (hasConfig && passwordRecovery) return <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 text-white"><form onSubmit={handlePasswordRecovery} className={card + " w-full max-w-sm p-7"}><h1 className="text-xl font-medium">Definir nova senha</h1><input required minLength={6} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={fieldClass + " mt-5"} placeholder="Nova senha"/>{recoveryError && <p className="mt-3 text-sm text-rose-300">{recoveryError}</p>}<button className={primaryBtn + " mt-4 w-full"}>Salvar senha</button></form></main>;
  if (hasConfig && !authUser) return <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 text-zinc-100"><form onSubmit={handleLogin} className={card + " w-full max-w-sm p-7"}><div className="mb-6"><span className="text-xs font-bold tracking-[.18em] text-lime-300">MOSAIC · CONTROLE OPERACIONAL</span><h1 className="mt-3 text-xl font-medium">Acessar sistema</h1><p className="mt-2 text-sm text-zinc-400">Entre com sua conta autorizada.</p></div><label className="text-xs text-zinc-400">E-mail</label><input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className={fieldClass + " mb-4 mt-2"}/><label className="text-xs text-zinc-400">Senha</label><input type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={fieldClass + " mb-4 mt-2"}/>{loginError && <p className="mb-3 text-xs text-rose-300">{loginError}</p>}{recoveryMessage && <p className="mb-3 text-xs text-emerald-300">{recoveryMessage}</p>}<button disabled={loginBusy} className={primaryBtn + " w-full"}>{loginBusy ? "Aguarde…" : "Entrar"}</button><button type="button" onClick={requestRecovery} className="mt-4 w-full text-xs text-zinc-400 hover:text-white">Esqueci minha senha</button></form></main>;

  const nav: { id: Screen; name: string }[] = [
    { id: "catalogs", name: "CADASTRO" }, { id: "launches", name: "LANÇAMENTOS" },
    { id: "results", name: "RESULTADOS" }, { id: "reports", name: "RELATÓRIOS" },
    { id: "dashboard", name: "DASHBOARD" }, { id: "instructions", name: "INSTRUÇÕES" },
  ];
  const kpis = [
    ["Total de Equipamentos", data.equipment.length, "no cadastro"],
    ["Equipamentos Operantes", Math.max(0, activeEquipmentCount - failedEquipmentCount), "sem falha aberta"],
    ["Equipamentos com Falha", failedEquipmentCount, "equipamentos com ocorrência aberta"],
    ["Tempo total indisponível acumulado no ano", fmtDuration(downtimeYear), String(year)],
    ["Tempo médio entre falhas acumulado no ano", fmtDuration(mtbf), String(year)],
    ["Tempo médio de reparo acumulado no ano", fmtDuration(mttr), String(year)],
  ];
  const catalogRows: AnyRow[] = catalogKind === "sectors" ? data.sectors
    : catalogKind === "categories" ? data.categories
    : catalogKind === "equipment" ? data.equipment
    : data.faults;
  const visibleCatalogRows = catalogRows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
  const recent = [...data.failures].sort((a, b) => b.failed_at.localeCompare(a.failed_at)).slice(0, 8);
  const title = screen === "dashboard" ? "Dashboard" : screen === "launches" ? "Lançamentos" : screen === "results" ? "Resultados" : screen === "reports" ? "Relatórios" : screen === "instructions" ? "Instruções" : "Cadastros";

  return <main className="min-h-screen bg-zinc-950 text-zinc-100">
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#111b2b]/95 backdrop-blur-xl print:hidden">
      <div className="flex h-14 items-center justify-between px-4 sm:px-7">
        <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-blue-600 font-black text-white">M</div><div><div className="text-sm font-semibold tracking-tight">Mosaic</div><div className="text-[9px] tracking-[.16em] text-zinc-500">CONTROLE DE EQUIPAMENTOS</div></div></div>
        <div className="flex items-center gap-2"><span className="hidden text-xs text-zinc-400 sm:inline">{authUser?.email ?? "Modo de demonstração"}</span>{authUser && <button onClick={signOut} className={btn}>Sair</button>}</div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-white/5 px-3 sm:px-7">{nav.map((item) => <button key={item.id} onClick={() => { setScreen(item.id); setSearch(""); setVisibleRows(50); }} className={"shrink-0 border-b-2 px-3 py-3 text-[10px] font-semibold tracking-wide transition " + (screen === item.id ? "border-lime-300 bg-blue-600/25 text-white" : "border-transparent text-zinc-400 hover:text-white")}>{item.name}</button>)}</nav>
    </header>

    <div className="mx-auto max-w-[1600px] p-4 sm:p-7">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-lime-300">Operação · Patrimonial</p><h1 className="mt-1 text-2xl font-medium tracking-tight">{title}</h1><p className="mt-1 text-xs text-zinc-500">{screen === "dashboard" ? "Indicadores de falhas e disponibilidade de equipamentos." : "Dados atualizados a partir dos lançamentos registrados."}</p></div>
        <div className="flex flex-wrap items-center gap-2"><label className="text-xs text-zinc-500">Ano</label><select value={year} onChange={(e) => setYear(Number(e.target.value))} className={fieldClass + " w-28 py-2"}>{Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i).map((y) => <option key={y} value={y}>{y}</option>)}</select>{screen === "launches" && <button onClick={() => { setActionError(""); setShowFailureForm(true); }} className={primaryBtn}>+ Novo lançamento</button>}{screen === "launches" && <button onClick={() => exportCsv()} className={btn}>Exportar CSV</button>}{(screen === "reports" || screen === "results") && <><button onClick={() => exportCsv(yearFailures)} className={btn}>Exportar CSV</button><button onClick={() => window.print()} className={btn}>Imprimir</button></>}</div>
      </div>

      {dataError && <div className="mb-5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">Erro ao carregar o módulo. {dataError} — aplique a migration 202611170002_equipment_control.sql no Supabase.</div>}
      {dataLoading && <div className="mb-4 text-xs text-zinc-500">Atualizando dados do Supabase…</div>}
      {actionError && <div role="alert" className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">{actionError}</div>}

      {screen === "dashboard" && <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">{kpis.map(([label, value, note], i) => <article key={label} className={card + " overflow-hidden p-4"}><p className="min-h-8 text-xs leading-relaxed text-zinc-400">{label}</p><p className={"mt-2 truncate text-2xl font-semibold tracking-tight " + (i === 2 && openFailures.length ? "text-rose-300" : "text-zinc-100")}>{value}</p><p className="mt-1 text-[10px] text-zinc-600">{note}</p></article>)}</div>
        <div className="grid gap-4 2xl:grid-cols-[1.65fr_1fr]">
          <div className="grid gap-4 lg:grid-cols-2"><DonutCard title="Top 10 equipamentos com mais falhas" rows={rankings.equipment}/><DonutCard title="Top 10 setores com mais falhas" rows={rankings.sectors}/><DonutCard title="Top 10 falhas mais frequentes" rows={rankings.faults}/><DonutCard title="Top 10 categorias com mais falhas" rows={rankings.categories}/></div>
          <div className="grid gap-4"><MonthlyChart title="Tempo total indisponível" values={monthlyDowntime} tone="bg-rose-500"/><MonthlyChart title="Tempo médio entre falhas" values={monthlyMtbf} tone="bg-orange-500"/><MonthlyChart title="Tempo médio de reparo" values={monthlyMttr} tone="bg-blue-500"/></div>
        </div>
        <section className={card + " mt-5 overflow-hidden"}><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div><h2 className="text-sm font-medium">Falhas recentes</h2><p className="mt-1 text-[10px] text-zinc-500">Os últimos registros do sistema</p></div><button onClick={() => setScreen("launches")} className={btn}>Ver lançamentos</button></div><FailureTable rows={recent} authorById={authorById} onResolve={resolveFailure} onEdit={editFailure}/></section>
      </>}

      {screen === "catalogs" && <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <aside className={card + " p-3"}><p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Cadastros</p>{(["sectors","categories","equipment","faults"] as CatalogKind[]).map((kind) => <button key={kind} onClick={() => { setCatalogKind(kind); setEditingId(""); setCatalogForm({}); setCatalogMessage(""); setCatalogError(""); }} className={"mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm " + (catalogKind === kind ? "bg-blue-600/20 text-white" : "text-zinc-400 hover:bg-zinc-800")}>{catalogLabels[kind]}<span className="text-xs text-zinc-500">{kind === "sectors" ? data.sectors.length : kind === "categories" ? data.categories.length : kind === "equipment" ? data.equipment.length : data.faults.length}</span></button>)}</aside>
        <section className={card + " overflow-hidden"}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4"><div><h2 className="font-medium">{catalogLabels[catalogKind]}</h2><p className="mt-1 text-xs text-zinc-500">{canManageCatalog ? "Gerencie os itens usados nos lançamentos." : "Consulte os cadastros do sistema."}</p></div><div className="flex gap-2"><input aria-label="Buscar cadastro" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className={fieldClass + " w-40 py-2"}/>{canManageCatalog && <button onClick={() => editCatalog()} className={primaryBtn}>+ Novo</button>}</div></div>
          {canManageCatalog && <form onSubmit={saveCatalog} className="grid gap-3 border-b border-white/10 bg-zinc-950/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-[11px] text-zinc-400">Nome<input required value={catalogForm.name ?? ""} onChange={(e) => setCatalogForm({ ...catalogForm, name: e.target.value })} className={fieldClass + " mt-1"} placeholder={catalogKind === "equipment" ? "Ex.: CAM_001" : "Nome"}/></label>
            {catalogKind === "sectors" && <><label className="text-[11px] text-zinc-400">Meta de disponibilidade (%)<input type="number" min="0" max="100" step="0.01" value={catalogForm.availability_target ? String(Number(catalogForm.availability_target) * 100) : ""} onChange={(e) => setCatalogForm({ ...catalogForm, availability_target: String(Number(e.target.value) / 100) })} className={fieldClass + " mt-1"} placeholder="99.9"/></label><label className="text-[11px] text-zinc-400">Meta de reparo (horas)<input required type="number" min="0" step="0.5" value={catalogForm.repair_target_hours ?? ""} onChange={(e) => setCatalogForm({ ...catalogForm, repair_target_hours: e.target.value })} className={fieldClass + " mt-1"} placeholder="96"/></label></>}
            {catalogKind === "equipment" && <><label className="text-[11px] text-zinc-400">Setor<select required value={catalogForm.sector_id ?? ""} onChange={(e) => setCatalogForm({ ...catalogForm, sector_id: e.target.value })} className={fieldClass + " mt-1"}><option value="">Selecione</option>{data.sectors.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="text-[11px] text-zinc-400">Categoria<select required value={catalogForm.category_id ?? ""} onChange={(e) => setCatalogForm({ ...catalogForm, category_id: e.target.value })} className={fieldClass + " mt-1"}><option value="">Selecione</option>{data.categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label></>}
            {catalogError && <p className="text-xs text-rose-300 sm:col-span-4">{catalogError}</p>}{catalogMessage && <p role="status" className="text-xs text-emerald-300 sm:col-span-4">{catalogMessage}</p>}
            <div className="flex items-end gap-2"><button disabled={catalogBusy} className={primaryBtn}>{catalogBusy ? "Salvando…" : editingId ? "Atualizar" : "Salvar"}</button>{editingId && <button type="button" onClick={() => editCatalog()} className={btn}>Cancelar edição</button>}</div>
          </form>}
          <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-zinc-800/60 text-zinc-400"><tr><th className="px-4 py-3">Nome</th>{catalogKind === "equipment" && <><th className="px-4 py-3">Setor</th><th className="px-4 py-3">Categoria</th></>}{catalogKind === "sectors" && <><th className="px-4 py-3">Meta disponibilidade</th><th className="px-4 py-3">Meta reparo</th></>}{canManageCatalog && <th className="px-4 py-3">Ações</th>}</tr></thead><tbody className="divide-y divide-white/5">{visibleCatalogRows.map((row) => <tr key={row.id} className="hover:bg-white/[.02]"><td className="px-4 py-3 text-zinc-200">{row.name}</td>{catalogKind === "equipment" && <><td className="px-4 py-3 text-zinc-400">{sectorById.get(row.sector_id) ?? "—"}</td><td className="px-4 py-3 text-zinc-400">{categoryById.get(row.category_id) ?? "—"}</td></>}{catalogKind === "sectors" && <><td className="px-4 py-3 text-zinc-400">{fmtNumber(Number(row.availability_target) * 100, 2)}%</td><td className="px-4 py-3 text-zinc-400">{row.repair_target_hours}h</td></>}{canManageCatalog && <td className="flex gap-2 px-4 py-3"><button onClick={() => editCatalog(row)} className={btn}>Editar</button><button onClick={() => deleteCatalog(row.id)} className="rounded-lg border border-rose-500/20 px-3 py-2 text-[10px] text-rose-300 hover:bg-rose-500/10">Excluir</button></td>}</tr>)}</tbody></table>{!visibleCatalogRows.length && <EmptyState text="Nenhum cadastro encontrado. Comece adicionando o primeiro item."/>}</div>
        </section>
      </div>}

      {screen === "launches" && <section className={card + " overflow-hidden"}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4"><div><h2 className="text-sm font-medium">Registro de falhas</h2><p className="mt-1 text-xs text-zinc-500">{currentRows.length} ocorrência(s) em {year}</p></div><input value={search} onChange={(e) => { setSearch(e.target.value); setVisibleRows(50); }} className={fieldClass + " w-56 py-2"} placeholder="Buscar equipamento, setor, falha…"/></div>
        <FailureTable rows={currentRows.slice(0, visibleRows)} authorById={authorById} onResolve={resolveFailure} onEdit={editFailure}/>{currentRows.length > visibleRows && <button onClick={() => setVisibleRows((n) => n + 50)} className={"m-4 " + btn}>Carregar mais ({currentRows.length - visibleRows})</button>}
      </section>}

      {screen === "results" && <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">{[[ "Falhas no ano", yearFailures.length ],[ "Horas indisponíveis", fmtDuration(downtimeYear) ],[ "Ocorrências em aberto", openFailures.length ]].map(([label,value]) => <article key={String(label)} className={card + " p-4"}><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></article>)}</div>
        <div className="grid gap-4 lg:grid-cols-2"><RankTable title="Top equipamentos por falhas" rows={rankings.equipment}/><RankTable title="Top setores por falhas" rows={rankings.sectors}/><RankTable title="Top falhas" rows={rankings.faults}/><RankTable title="Top categorias" rows={rankings.categories}/><RankTable title="Equipamentos com maior indisponibilidade" rows={rankings.equipmentDowntime} duration/><RankTable title="Setores com maior indisponibilidade" rows={rankings.sectorDowntime} duration/></div>
        <section className={card + " p-4"}><h2 className="mb-4 text-sm font-medium">Resumo mensal · {year}</h2><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="text-zinc-500"><tr><th className="p-2">Mês</th><th className="p-2">Falhas</th><th className="p-2">Indisponibilidade total</th><th className="p-2">MTBF</th><th className="p-2">MTTR</th></tr></thead><tbody className="divide-y divide-white/5">{monthNames.map((m,i) => <tr key={m}><td className="p-2 text-zinc-200">{m}</td><td className="p-2">{monthlyIncidents[i].length}</td><td className="p-2">{fmtDuration(monthlyDowntime[i])}</td><td className="p-2">{fmtDuration(monthlyMtbf[i])}</td><td className="p-2">{fmtDuration(monthlyMttr[i])}</td></tr>)}</tbody></table></div></section>
      </div>}

      {screen === "reports" && <div className="space-y-5">
        <section className={card + " p-5"}><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-widest text-lime-300">Relatório operacional</p><h2 className="mt-1 text-xl font-medium">Falhas e disponibilidade · {year}</h2><p className="mt-1 text-xs text-zinc-500">Gerado em {new Date().toLocaleString("pt-BR")}</p></div><button onClick={() => window.print()} className={primaryBtn + " print:hidden"}>Imprimir / Salvar PDF</button></div><div className="grid gap-3 sm:grid-cols-3">{[[ "Equipamentos", data.equipment.length ],[ "Falhas registradas", yearFailures.length ],[ "Tempo indisponível", fmtDuration(downtimeYear) ]].map(([l,v]) => <div key={String(l)} className="rounded-lg border border-white/10 bg-zinc-950 p-4"><p className="text-xs text-zinc-500">{l}</p><p className="mt-2 font-semibold">{v}</p></div>)}</div></section>
        <div className="grid gap-4 lg:grid-cols-2"><MonthlyChart title="Indisponibilidade mensal" values={monthlyDowntime} tone="bg-rose-500"/><MonthlyChart title="Tempo médio entre falhas" values={monthlyMtbf} tone="bg-orange-500"/><RankTable title="Top 10 falhas" rows={rankings.faults}/><RankTable title="Top 10 equipamentos por indisponibilidade" rows={rankings.equipmentDowntime} duration/><RankTable title="Top 10 setores por falhas" rows={rankings.sectors}/><RankTable title="Top 10 categorias" rows={rankings.categories}/></div>
      </div>}

      {screen === "instructions" && <div className="grid gap-4 lg:grid-cols-2">{[
        ["1 · Configure os cadastros", "Cadastre setores com metas de disponibilidade e reparo. Em seguida, cadastre categorias, equipamentos vinculados a setor e categoria, e tipos de falha."],
        ["2 · Registre uma ocorrência", "Em Lançamentos, escolha o equipamento, a falha e o horário inicial. O sistema completa setor/categoria e calcula o tempo parado e o prazo automaticamente."],
        ["3 · Encerre a falha", "Quando o equipamento voltar à operação, use Marcar retorno no lançamento aberto. O tempo de indisponibilidade e o status são recalculados."],
        ["4 · Acompanhe os indicadores", "O Dashboard e Resultados consideram o ano selecionado. Relatórios permite imprimir ou salvar em PDF."],
        ["Autoria e permissões", "Cada registro recebe a autoria da sessão autenticada. Operadores lançam ocorrências; supervisores e administradores gerenciam cadastros; exclusões de cadastro exigem admin."],
        ["Primeiro acesso", "Se os cadastros estiverem vazios, comece por Setores e Categorias. Depois cadastre Equipamentos e Tipos de falha. Nenhuma linha real do Excel foi importada."],
      ].map(([h,p]) => <article key={h} className={card + " p-5"}><h2 className="font-medium text-zinc-100">{h}</h2><p className="mt-2 text-sm leading-relaxed text-zinc-400">{p}</p></article>)}</div>}
    </div>

    {showFailureForm && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"><form onSubmit={createFailure} className={card + " my-auto w-full max-w-xl p-5 sm:p-7"}><div className="mb-5 flex items-start justify-between"><div><h2 className="text-xl font-medium">{editingFailureId ? "Editar lançamento" : "Novo lançamento"}</h2><p className="mt-1 text-xs text-zinc-500">O sistema registra seu usuário como autor.</p></div><button type="button" onClick={() => { setShowFailureForm(false); setEditingFailureId(""); }} className={btn}>Fechar</button></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs text-zinc-400">Equipamento<select required value={failureForm.equipment_id} onChange={(e) => setFailureForm({ ...failureForm, equipment_id: e.target.value })} className={fieldClass + " mt-2"}><option value="">Selecione</option>{data.equipment.map((x) => <option key={x.id} value={x.id}>{x.name} · {sectorById.get(x.sector_id)}</option>)}</select></label><label className="text-xs text-zinc-400">Tipo de falha<select required value={failureForm.fault_type_id} onChange={(e) => setFailureForm({ ...failureForm, fault_type_id: e.target.value })} className={fieldClass + " mt-2"}><option value="">Selecione</option>{data.faults.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="text-xs text-zinc-400 sm:col-span-2">Data e hora da falha<input required type="datetime-local" value={failureForm.failed_at} onChange={(e) => setFailureForm({ ...failureForm, failed_at: e.target.value })} className={fieldClass + " mt-2"}/></label><label className="text-xs text-zinc-400 sm:col-span-2">Observação<textarea rows={3} value={failureForm.observation} onChange={(e) => setFailureForm({ ...failureForm, observation: e.target.value })} className={fieldClass + " mt-2"} placeholder="Detalhes da ocorrência"/></label></div>{actionError && <p className="mt-3 text-xs text-rose-300">{actionError}</p>}<button disabled={saving} className={primaryBtn + " mt-5 w-full"}>{saving ? "Salvando…" : editingFailureId ? "Salvar alterações" : "Salvar lançamento"}</button></form></div>}
  </main>;
}

function FailureTable({ rows, authorById, onResolve, onEdit }: { rows: Failure[]; authorById: Map<string, string>; onResolve: (id: string) => void; onEdit: (row: Failure) => void }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-xs"><thead className="bg-zinc-800/50 text-[10px] uppercase tracking-wide text-zinc-500"><tr>{["Data da falha","Equipamento","Setor","Categoria","Falha","Tempo parado","Status","Preenchido por","Ação"].map((x) => <th key={x} className="px-3 py-3 font-medium">{x}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{rows.map((r) => <tr key={r.id} className="hover:bg-white/[.02]"><td className="whitespace-nowrap px-3 py-3 text-zinc-300">{fmtDate(r.failed_at)} {r.failed_at ? new Date(r.failed_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : ""}</td><td className="px-3 py-3 text-zinc-100">{r.equipment || "—"}</td><td className="px-3 py-3 text-zinc-400">{r.sector || "—"}</td><td className="px-3 py-3 text-zinc-400">{r.category || "—"}</td><td className="px-3 py-3 text-zinc-300">{r.failure || "—"}</td><td className="whitespace-nowrap px-3 py-3 text-zinc-300">{fmtDuration(durationHours(r))}</td><td className="px-3 py-3"><StatusBadge value={r.status || (r.returned_at ? "Concluído" : "Em andamento")}/></td><td className="px-3 py-3"><span className="rounded-full bg-zinc-800 px-2.5 py-1 text-[10px] text-zinc-300">{authorById.get(r.created_by ?? "") ?? "Sem autoria"}</span></td><td className="flex gap-1 px-3 py-3">{!r.returned_at && <button onClick={() => onResolve(r.id)} className="rounded-md border border-lime-300/20 px-2 py-1.5 text-[10px] text-lime-200 hover:bg-lime-300/10">Marcar retorno</button>}<button onClick={() => onEdit(r)} className="rounded-md border border-white/10 px-2 py-1.5 text-[10px] text-zinc-300 hover:bg-zinc-800">Editar</button></td></tr>)}</tbody></table>{!rows.length && <EmptyState text="Nenhum lançamento neste período."/>}</div>;
}
function RankTable({ title, rows, duration = false }: { title: string; rows: { name: string; value: number }[]; duration?: boolean }) {
  return <section className={card + " p-4"}><h3 className="mb-3 text-sm font-medium">{title}</h3>{rows.length ? <ol className="space-y-2">{rows.map((r,i) => <li key={r.name} className="flex items-center gap-3 text-xs"><span className="grid size-6 shrink-0 place-items-center rounded-md bg-zinc-800 text-[10px] text-zinc-500">{i+1}</span><span className="min-w-0 flex-1 truncate text-zinc-300">{r.name}</span><span className="font-medium text-zinc-100">{duration ? fmtDuration(r.value) : fmtNumber(r.value)}</span></li>)}</ol> : <p className="py-8 text-center text-xs text-zinc-500">Sem dados para o período.</p>}</section>;
}
function EmptyState({ text }: { text: string }) { return <div className="px-5 py-12 text-center text-sm text-zinc-500">{text}</div>; }
