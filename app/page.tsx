"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import EquipmentControl from "./equipment-control";
import TrafficControl from "./traffic-control";
import MetalControl from "./metal-control";
import BreathalyzerControl from "./breathalyzer-control";
import TruckControl from "./truck-control";
import VehicleControl from "./vehicle-control";

type ModuleData = {
  id: string;
  name: string;
  short: string;
  icon: string;
  description: string;
  fields: string[];
  rows: string[][];
};

const modules: ModuleData[] = [
  { id: "transito", name: "Indicadores de trânsito", short: "Trânsito", icon: "↗", description: "Fiscalizações, infrações e ações de trânsito", fields: ["Data", "Ação", "Veículo", "Placa", "Infração", "Status", "Preenchido por"], rows: [
    ["2026-11-12", "Blitz", "VAN", "ABC-1D23", "Velocidade acima do limite", "Em análise", "usuario1"], ["2026-11-11", "Rotina", "ÔNIBUS", "DEF-4G56", "Documentação regular", "Aprovado", "usuario2"], ["2026-11-10", "Credenciamento", "CAMINHÃO", "GHI-7J89", "Cadastro de acesso", "Pendente", "usuario3"], ["2026-10-28", "Blitz", "HILUX", "JKL-2M34", "Farol danificado", "Solucionado", "usuario1"], ["2026-10-22", "Rotina", "FIORINO", "NOP-5Q67", "Sem apontamento", "Aprovado", "usuario4"]
  ] },
  { id: "etilometro", name: "Etilômetro", short: "Etilômetro", icon: "◉", description: "Testes de demonstração por período e empresa", fields: ["Data", "Horário", "Matrícula demo", "Empresa fictícia", "Resultado", "Vínculo", "Preenchido por"], rows: [
    ["2026-11-14", "Manhã", "DEMO-001", "Empresa Alfa", "Negativo", "Terceiro", "usuario2"], ["2026-11-14", "Noite", "DEMO-002", "Empresa Beta", "Negativo", "Próprio", "usuario3"], ["2026-11-13", "Manhã", "DEMO-003", "Empresa Gama", "Negativo", "Terceiro", "usuario1"], ["2026-10-30", "Noite", "DEMO-004", "Empresa Alfa", "Positivo (simulado)", "Terceiro", "usuario4"], ["2026-10-29", "Manhã", "DEMO-005", "Empresa Delta", "Negativo", "Próprio", "usuario2"]
  ] },
  { id: "veiculos", name: "Quilometragem e abastecimento", short: "Veículos", icon: "▰", description: "Uso da frota, quilometragem e abastecimentos", fields: ["Data", "Veículo", "KM rodado", "Combustível", "Valor", "Condutor", "Preenchido por"], rows: [
    ["2026-11-16", "Veículo DEMO-01", "84 km", "Etanol", "R$ 182,40", "Condutor Alfa", "usuario1"], ["2026-11-15", "Veículo DEMO-02", "61 km", "Gasolina", "R$ 210,00", "Condutor Beta", "usuario3"], ["2026-11-13", "Veículo DEMO-01", "97 km", "Etanol", "R$ 195,30", "Condutor Gama", "usuario2"], ["2026-10-27", "Veículo DEMO-03", "42 km", "Gasolina", "R$ 158,00", "Condutor Delta", "usuario4"], ["2026-10-21", "Veículo DEMO-02", "73 km", "Etanol", "R$ 176,50", "Condutor Alfa", "usuario1"]
  ] },
  { id: "caminhoes", name: "Inspeção de caminhões", short: "Caminhões", icon: "▱", description: "Aferições, pesos e anomalias", fields: ["Data", "Placa demo", "Transportadora", "Produto", "Peso aferido", "Anomalia", "Preenchido por"], rows: [
    ["2026-11-16", "AAA-0A00", "Transportadora Alfa", "Produto teste A", "42.500 kg", "Nenhuma", "usuario3"], ["2026-11-15", "BBB-1B11", "Transportadora Beta", "Produto teste B", "38.200 kg", "Nenhuma", "usuario1"], ["2026-11-13", "CCC-2C22", "Transportadora Gama", "Produto teste A", "40.100 kg", "Divergência simulada", "usuario2"], ["2026-10-29", "DDD-3D33", "Transportadora Delta", "Produto teste C", "36.800 kg", "Nenhuma", "usuario4"], ["2026-10-26", "EEE-4E44", "Transportadora Alfa", "Produto teste B", "41.300 kg", "Lacre simulado", "usuario3"]
  ] },
  { id: "metais", name: "Detector de metais", short: "Metais", icon: "⌁", description: "Passagens, locais e ocorrências de exemplo", fields: ["Data", "Horário", "Movimento", "Local demo", "Quantidade", "Ocorrência", "Preenchido por"], rows: [
    ["2026-11-16", "07:15", "Saída", "Portaria A", "4", "Sem ocorrência", "usuario4"], ["2026-11-15", "08:20", "Entrada", "Portaria B", "2", "Sem ocorrência", "usuario1"], ["2026-11-14", "17:10", "Saída", "Portaria A", "5", "Verificação simulada", "usuario2"], ["2026-10-31", "06:50", "Entrada", "Portaria C", "3", "Sem ocorrência", "usuario3"], ["2026-10-28", "18:05", "Saída", "Portaria B", "1", "Sem ocorrência", "usuario4"]
  ] },
  { id: "equipamentos", name: "Equipamentos offline", short: "Equipamentos", icon: "⌘", description: "Falhas, indisponibilidade e retorno à operação", fields: ["Data da falha", "Equipamento demo", "Setor", "Falha", "Status", "Retorno", "Preenchido por"], rows: [
    ["2026-11-16 09:10", "Câmera DEMO-01", "Portaria A", "Sem comunicação", "Em andamento", "—", "usuario2"], ["2026-11-15 13:45", "Leitor DEMO-02", "Portaria B", "Falha de leitura", "Concluído", "2026-11-15 15:20", "usuario1"], ["2026-11-13 08:30", "Rádio DEMO-03", "Ronda", "Bateria baixa", "Concluído", "2026-11-13 09:10", "usuario3"], ["2026-10-28 11:00", "Câmera DEMO-04", "Pátio", "Imagem indisponível", "Em andamento", "—", "usuario4"], ["2026-10-23 16:40", "Alarme DEMO-05", "Administração", "Sem energia", "Concluído", "2026-10-23 18:05", "usuario2"]
  ] },
];


type DbRecord = Record<string, unknown> & { created_by?: string | null };
type Profile = { id: string; display_name: string };

type FormField = { name: string; label: string; type?: string; required?: boolean; options?: string[] };
type RecordFormConfig = { table: string; fields: FormField[] };
const recordForms: Record<string, RecordFormConfig> = {
  transito: { table: "traffic_inspections", fields: [
    { name: "inspected_at", label: "Data", type: "date", required: true },
    { name: "activity_type", label: "Tipo de ação", required: true },
    { name: "vehicle", label: "Veículo" }, { name: "plate", label: "Placa" },
    { name: "violation", label: "Infração / observação" },
    { name: "status", label: "Status", options: ["Em análise", "Pendente", "Aprovado", "Solucionado", "Reprovado"] },
  ] },
  etilometro: { table: "breathalyzer_tests", fields: [
    { name: "tested_at", label: "Data", type: "date", required: true },
    { name: "shift", label: "Período", options: ["Manhã", "Tarde", "Noite"] },
    { name: "employee_registry", label: "Matrícula" }, { name: "company", label: "Empresa" },
    { name: "result", label: "Resultado", options: ["Negativo", "Positivo"] },
    { name: "worker_type", label: "Vínculo", options: ["Próprio", "Terceiro"] },
  ] },
  veiculos: { table: "fuel_records", fields: [
    { name: "recorded_on", label: "Data", type: "date", required: true },
    { name: "vehicle", label: "Veículo", required: true },
    { name: "distance_km", label: "KM rodado", type: "number" },
    { name: "fuel_type", label: "Combustível", options: ["Etanol", "Gasolina", "Diesel", "Outro"] },
    { name: "total_paid", label: "Valor pago (R$)", type: "number" },
    { name: "driver_name", label: "Condutor" },
  ] },
  caminhoes: { table: "truck_weighings", fields: [
    { name: "weighed_at", label: "Data da pesagem", type: "date", required: true },
    { name: "plate", label: "Placa", required: true },
    { name: "carrier", label: "Transportadora" }, { name: "product", label: "Produto" },
    { name: "measured_weight_kg", label: "Peso aferido (kg)", type: "number" },
    { name: "anomaly", label: "Anomalia / observação" },
  ] },
  metais: { table: "metal_detector_logs", fields: [
    { name: "recorded_at", label: "Data e horário", type: "datetime-local", required: true },
    { name: "direction", label: "Movimento", options: ["Entrada", "Saída"] },
    { name: "location", label: "Local", required: true },
    { name: "quantity", label: "Quantidade", type: "number" },
    { name: "occurrence", label: "Ocorrência / observação" },
  ] },
  equipamentos: { table: "equipment_failures", fields: [
    { name: "failed_at", label: "Data e horário da falha", type: "datetime-local", required: true },
    { name: "equipment", label: "Equipamento", required: true },
    { name: "sector", label: "Setor" }, { name: "failure", label: "Falha", required: true },
    { name: "status", label: "Status", options: ["Em andamento", "Concluído"] },
    { name: "returned_at", label: "Data e horário do retorno", type: "datetime-local" },
  ] },
};

const display = (value: unknown, fallback = "—") => value === null || value === undefined || value === "" ? fallback : String(value);
const dateValue = (value: unknown) => value ? String(value).slice(0, 10) : "—";
const timeValue = (value: unknown) => value ? String(value).slice(11, 16) || String(value).slice(0, 5) : "—";

const formatDate = (value: string) => value.slice(0, 10).split("-").reverse().join("/");
const userInitial = (value: string) => value.replace("usuario", "U");

function StatusBadge({ value }: { value: string }) {
  const lower = value.toLowerCase();
  const color = lower.includes("pendente") || lower.includes("andamento") || lower.includes("análise")
    ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
    : lower.includes("positivo") || lower.includes("diverg") || lower.includes("lacre")
      ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  return <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${color}`}>{value}</span>;
}

function UserPill({ value }: { value: string }) {
  return <span className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-zinc-800 px-3 py-1 text-xs text-zinc-300"><span className="grid size-5 place-items-center rounded-full bg-zinc-700 text-[9px] font-semibold text-zinc-100">{userInitial(value)}</span>{value}</span>;
}

export default function Home() {
  const [current, setCurrent] = useState("inicio");
  const [period, setPeriod] = useState("todos");
  const [query, setQuery] = useState("");
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
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [databaseRows, setDatabaseRows] = useState<Record<string, string[][]>>({});
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [recordsRefresh, setRecordsRefresh] = useState(0);
  const [showNewRecord, setShowNewRecord] = useState(false);
  const [newRecordModule, setNewRecordModule] = useState("transito");
  const [recordForm, setRecordForm] = useState<Record<string, string>>({});
  const [recordBusy, setRecordBusy] = useState(false);
  const [recordError, setRecordError] = useState("");
  const [recordSuccess, setRecordSuccess] = useState("");
  const hasSupabaseConfig = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const supabase = useMemo(() => hasSupabaseConfig ? createClient() : null, [hasSupabaseConfig]);

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    let mounted = true;
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) setPasswordRecovery(true);
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) { setAuthUser(data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null); setAuthReady(true); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted && event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      if (mounted) setAuthUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !authUser) { setDatabaseRows({}); return; }
    const client = supabase;
    let cancelled = false;
    const specs = [
      { id: "transito", table: "traffic_inspections", date: "inspected_at", map: (r: DbRecord, author: string) => [dateValue(r.inspected_at), display(r.activity_type), display(r.vehicle), display(r.plate), display(r.violation), display(r.status), author] },
      { id: "etilometro", table: "breathalyzer_tests", date: "tested_at", map: (r: DbRecord, author: string) => [dateValue(r.tested_at), display(r.shift), display(r.employee_registry), display(r.company), display(r.result), display(r.worker_type), author] },
      { id: "veiculos", table: "fuel_records", date: "recorded_on", map: (r: DbRecord, author: string) => [dateValue(r.recorded_on), display(r.vehicle), r.distance_km == null ? "—" : `${r.distance_km} km`, display(r.fuel_type), r.total_paid == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(r.total_paid)), display(r.driver_name), author] },
      { id: "caminhoes", table: "truck_weighings", date: "weighed_at", map: (r: DbRecord, author: string) => [dateValue(r.weighed_at), display(r.plate), display(r.carrier), display(r.product), r.measured_weight_kg == null ? "—" : `${r.measured_weight_kg} kg`, display(r.anomaly), author] },
      { id: "metais", table: "metal_detector_logs", date: "recorded_at", map: (r: DbRecord, author: string) => [dateValue(r.recorded_at), timeValue(r.recorded_at), display(r.direction), display(r.location), display(r.quantity), display(r.occurrence), author] },
      { id: "equipamentos", table: "equipment_failures", date: "failed_at", map: (r: DbRecord, author: string) => [r.failed_at ? String(r.failed_at).slice(0, 16).replace("T", " ") : "—", display(r.equipment), display(r.sector), display(r.failure), display(r.status), r.returned_at ? String(r.returned_at).slice(0, 16).replace("T", " ") : "—", author] },
    ];
    async function loadData() {
      setDataLoading(true); setDataError("");
      const profileResult = await client.from("profiles").select("id, display_name");
      if (profileResult.error) { if (!cancelled) { setDataError(profileResult.error.message); setDataLoading(false); } return; }
      const profileMap = new Map(((profileResult.data ?? []) as Profile[]).map((profile) => [profile.id, profile.display_name || profile.id.slice(0, 8)]));
      const results = await Promise.all(specs.map(async (spec) => {
        const result = await client.from(spec.table).select("*").order(spec.date, { ascending: false, nullsFirst: false }).limit(500);
        if (result.error) throw new Error(result.error.message);
        const rows = ((result.data ?? []) as DbRecord[]).map((row) => spec.map(row, row.created_by ? profileMap.get(row.created_by) ?? "Usuário" : "Sem autoria histórica"));
        return [spec.id, rows] as const;
      }));
      if (!cancelled) setDatabaseRows(Object.fromEntries(results));
    }
    loadData().catch((error: unknown) => { if (!cancelled) setDataError(error instanceof Error ? error.message : "Não foi possível carregar os registros."); }).finally(() => { if (!cancelled) setDataLoading(false); });
    return () => { cancelled = true; };
  }, [supabase, authUser, recordsRefresh]);

  const viewModules = useMemo(() => authUser ? modules.map((module) => ({ ...module, rows: databaseRows[module.id] ?? [] })) : modules, [authUser, databaseRows]);
  const selectedModule = viewModules.find((module) => module.id === current);
  const allRows = useMemo(() => viewModules.flatMap((module) => module.rows
    .filter((row) => (period === "todos" || row[0].toLowerCase().includes(period === "novembro" ? "11" : "10"))
      && (!query || `${module.name} ${row.join(" ")}`.toLowerCase().includes(query.toLowerCase())))
    .map((row) => ({ module, row }))), [period, query, viewModules]);
  const recentRows = [...allRows].sort((a, b) => b.row[0].localeCompare(a.row[0])).slice(0, 8);


  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoginError(""); setLoginBusy(true);
    if (!supabase) { setLoginError("Configure as chaves do Supabase no ambiente."); setLoginBusy(false); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) setLoginError(error.message); else setLoginPassword("");
    setLoginBusy(false);
  }
  async function handleLogout() { await supabase?.auth.signOut(); setCurrent("inicio"); }

  async function handleCreateRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setRecordError(""); setRecordSuccess("");
    if (!supabase || !authUser) { setRecordError("Entre no sistema para criar registros."); return; }
    const config = recordForms[newRecordModule];
    if (!config) { setRecordError("Selecione um módulo válido."); return; }
    setRecordBusy(true);
    const payload: Record<string, string | number | null> = {};
    for (const field of config.fields) {
      const value = recordForm[field.name]?.trim() ?? "";
      if (!value) continue;
      payload[field.name] = field.type === "number" ? Number(value) : value;
    }
    const { error } = await supabase.from(config.table).insert(payload);
    if (error) setRecordError(error.message);
    else {
      setRecordSuccess("Registro salvo. A autoria foi vinculada à sua conta.");
      setRecordForm({});
      setRecordsRefresh((value) => value + 1);
    }
    setRecordBusy(false);
  }

  function openNewRecord() {
    setNewRecordModule(current !== "inicio" && recordForms[current] ? current : "transito");
    setRecordForm({});
    setRecordError("");
    setRecordSuccess("");
    setShowNewRecord(true);
  }


  async function handlePasswordRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setRecoveryError(""); setRecoveryMessage(""); setRecoveryBusy(true);
    if (!supabase) { setRecoveryError("Supabase não está configurado."); setRecoveryBusy(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setRecoveryError(error.message);
    else {
      setRecoveryMessage("Senha alterada. Você já pode entrar com a nova senha.");
      setNewPassword("");
      window.history.replaceState(null, "", window.location.pathname);
      setPasswordRecovery(false);
    }
    setRecoveryBusy(false);
  }

  async function requestPasswordRecovery() {
    setRecoveryError(""); setRecoveryMessage(""); setLoginError("");
    if (!supabase) { setLoginError("Supabase não está configurado."); return; }
    if (!loginEmail) { setLoginError("Informe seu e-mail para receber o link de recuperação."); return; }
    setLoginBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, { redirectTo: window.location.origin });
    if (error) setLoginError(error.message);
    else setRecoveryMessage("Se esse e-mail estiver cadastrado, você receberá um link para redefinir a senha.");
    setLoginBusy(false);
  }

  function go(id: string) {
    setCurrent(id);
    setQuery("");
  }

  function exportCsv() {
    const rows = current === "inicio"
      ? allRows
      : (selectedModule?.rows ?? []).map((row) => ({ module: selectedModule!, row }));
    const csv = `Área;${rows[0]?.module.fields.join(";") ?? ""}\n${rows.map(({ module, row }) => [module.name, ...row].join(";")).join("\n")}`;
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    anchor.download = `demonstracao-${current}.csv`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  function renderCell(value: string, field: string, index: number, row: string[]) {
    if (index === row.length - 1) return <UserPill value={value} />;
    if (index === 0) return formatDate(value);
    if (/status|resultado|anomalia|ocorrência/i.test(field) && !/nenhuma|sem ocorrência|negativo/i.test(value.toLowerCase())) return <StatusBadge value={value} />;
    if (/status|resultado/i.test(field) && /negativo|concluído|aprovado|solucionado/i.test(value.toLowerCase())) return <StatusBadge value={value} />;
    return value;
  }

  function Table({ rows, fields }: { rows: string[][]; fields: string[] }) {
    return <div className="overflow-x-auto"><table className="w-full min-w-max border-collapse text-left text-sm"><thead className="bg-zinc-800/40 text-[10px] uppercase tracking-[0.12em] text-zinc-500"><tr>{fields.map((field) => <th key={field} className="border-b border-white/10 px-4 py-3 font-medium">{field}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{rows.map((row, rowIndex) => <tr key={`${row[0]}-${rowIndex}`} className="transition-colors hover:bg-zinc-800/30">{row.map((value, index) => <td key={`${index}-${value}`} className="px-4 py-3 text-sm text-zinc-300">{renderCell(value, fields[index], index, row)}</td>)}</tr>)}</tbody></table>{rows.length === 0 && <div className="px-6 py-12 text-center text-sm text-zinc-500">Nenhum registro para os filtros selecionados.</div>}</div>;
  }

  const navItems = [{ id: "inicio", name: "Visão geral", icon: "▦" }, ...viewModules.map(({ id, short, icon }) => ({ id, name: short, icon }))];
  const kpis = [["Registros carregados", String(viewModules.reduce((total, module) => total + module.rows.length, 0)), authUser ? "Até 500 recentes por módulo" : "30 linhas inventadas", "▤"], ["Áreas integradas", "6", "Módulos no portal", "▦"], ["Usuários", authUser ? "Autenticado" : "4 exemplos", authUser?.email ?? "Autoria simulada", "♙"], ["Fonte dos dados", authUser ? "Supabase" : "Demonstração", authUser ? "Sessão autenticada" : "Dados inventados", "◷"]];


  if (hasSupabaseConfig && passwordRecovery) return <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 text-zinc-100"><form onSubmit={handlePasswordRecovery} className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/70 p-7 shadow-2xl backdrop-blur-xl"><div className="mb-6"><div className="mb-4 grid size-11 place-items-center rounded-xl border border-white/10 bg-zinc-800 font-semibold text-lime-300">OP</div><h1 className="text-xl font-medium tracking-tight">Definir nova senha</h1><p className="mt-2 text-sm text-zinc-400">Escolha uma senha nova para acessar o painel.</p></div><label className="mb-2 block text-xs text-zinc-400" htmlFor="new-password">Nova senha</label><input id="new-password" type="password" required minLength={6} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mb-4 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-lime-300/50"/>{recoveryError && <p role="alert" className="mb-3 text-xs text-rose-300">{recoveryError}</p>}{recoveryMessage && <p role="status" className="mb-3 text-xs text-emerald-300">{recoveryMessage}</p>}<button disabled={recoveryBusy} className="w-full rounded-lg bg-lime-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-200 disabled:opacity-60">{recoveryBusy ? "Salvando…" : "Salvar nova senha"}</button></form></main>;
  if (hasSupabaseConfig && !authReady) return <main className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-300">Verificando sessão do Supabase…</main>;
  if (hasSupabaseConfig && !authUser) return <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 text-zinc-100"><form onSubmit={handleLogin} className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/70 p-7 shadow-2xl backdrop-blur-xl"><div className="mb-6"><div className="mb-4 grid size-11 place-items-center rounded-xl border border-white/10 bg-zinc-800 font-semibold text-lime-300">OP</div><h1 className="text-xl font-medium tracking-tight">Acessar painel operacional</h1><p className="mt-2 text-sm text-zinc-400">Entre com seu usuário autorizado.</p></div><label className="mb-2 block text-xs text-zinc-400" htmlFor="login-email">E-mail</label><input id="login-email" type="email" required autoComplete="username" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} className="mb-4 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-lime-300/50"/><label className="mb-2 block text-xs text-zinc-400" htmlFor="login-password">Senha</label><input id="login-password" type="password" required autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} className="mb-4 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-lime-300/50"/>{loginError && <p role="alert" className="mb-3 text-xs text-rose-300">{loginError}</p>}<button disabled={loginBusy} className="w-full rounded-lg bg-lime-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-200 disabled:opacity-60">{loginBusy ? "Entrando…" : "Entrar"}</button><button type="button" onClick={requestPasswordRecovery} disabled={loginBusy} className="mt-3 w-full text-xs text-zinc-400 transition-colors hover:text-white disabled:opacity-60">Esqueci minha senha</button>{recoveryMessage && <p role="status" className="mt-3 text-center text-xs text-emerald-300">{recoveryMessage}</p>}<p className="mt-4 text-center text-[11px] leading-relaxed text-zinc-500">Acesso por convite. Peça ao administrador para criar sua conta.</p></form></main>;

  return <div className="min-h-screen bg-zinc-950 text-zinc-100">
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="border-b border-white/10 bg-zinc-950 p-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-b-0 lg:p-5">
        <div className="flex items-center gap-3 px-1"><div className="grid size-10 place-items-center rounded-xl border border-white/10 bg-zinc-800 font-semibold text-lime-300">OP</div><div><p className="text-sm font-medium tracking-tight text-zinc-100">Operação Integrada</p><p className="mt-0.5 text-[10px] tracking-[0.14em] text-zinc-500">{authUser ? "CAJATI · SUPABASE" : "CAJATI · DEMONSTRAÇÃO"}</p></div></div>
        <p className="mb-2 mt-7 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600 lg:block">Workspace</p>
        <nav className="mt-4 flex gap-1 overflow-x-auto pb-1 lg:mt-0 lg:flex-col lg:overflow-visible">{navItems.map((item) => <button key={item.id} onClick={() => go(item.id)} className={`flex shrink-0 items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${current === item.id ? "border-white/10 bg-zinc-900 text-zinc-100" : "border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"}`}><span className="w-4 text-center text-zinc-500">{item.icon}</span>{item.name}</button>)}</nav>
        <div className="mt-auto hidden space-y-3 pt-8 lg:block"><div className="rounded-xl border border-white/10 bg-zinc-900/50 p-3 backdrop-blur-md"><p className="text-xs font-medium text-zinc-200">Ambiente demonstrativo</p><p className="mt-1 text-[11px] leading-relaxed text-zinc-500">Registros inventados. Nenhuma planilha foi importada.</p></div><div className="flex items-center gap-3 border-t border-white/10 px-1 pt-4"><div className="grid size-8 place-items-center rounded-full border border-white/10 bg-zinc-800 text-xs font-medium text-zinc-300">AD</div><div><p className="text-xs font-medium text-zinc-200">Administrador demo</p><p className="text-[10px] text-zinc-500">Visualização sem login</p></div></div></div>
      </aside>

      <main className="min-w-0">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/10 bg-zinc-950/80 px-4 backdrop-blur-xl sm:px-7"><p className="text-xs text-zinc-500">Operação <span className="px-1.5 text-zinc-700">/</span><span className="text-zinc-300">{current === "inicio" ? "Visão geral" : selectedModule?.name}</span></p><div className="flex items-center gap-3">{authUser && current !== "equipamentos" && current !== "veiculos" && current !== "transito" && current !== "metais" && current !== "etilometro" && current !== "caminhoes" && <button onClick={openNewRecord} className="rounded-lg bg-lime-300 px-3 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-lime-200">+ Novo registro</button>}<span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-1 text-[10px] font-medium text-zinc-300">● {authUser ? authUser.email : "Dados de exemplo"}</span>{authUser && <button onClick={handleLogout} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Sair</button>}<div className="grid size-8 place-items-center rounded-full border border-white/10 bg-zinc-800 text-[10px] font-semibold text-zinc-300">{authUser ? "U" : "AD"}</div></div></header>

        {showNewRecord && authUser && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"><form onSubmit={handleCreateRecord} className="my-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl sm:p-7"><div className="mb-6 flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime-300/80">Novo lançamento</p><h2 className="mt-1 text-xl font-medium tracking-tight text-zinc-100">Criar registro operacional</h2><p className="mt-1 text-sm text-zinc-400">O autor será identificado automaticamente pela sua conta.</p></div><button type="button" onClick={() => setShowNewRecord(false)} aria-label="Fechar formulário" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white">✕</button></div><label htmlFor="record-module" className="mb-2 block text-xs text-zinc-400">Módulo</label><select id="record-module" value={newRecordModule} onChange={(event) => { setNewRecordModule(event.target.value); setRecordForm({}); }} className="mb-5 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-lime-300/50">{modules.map((module) => <option key={module.id} value={module.id}>{module.name}</option>)}</select><div className="grid gap-4 sm:grid-cols-2">{(recordForms[newRecordModule]?.fields ?? []).map((field) => <label key={field.name} className="block"><span className="mb-2 block text-xs text-zinc-400">{field.label}{field.required ? " *" : ""}</span>{field.options ? <select required={field.required} value={recordForm[field.name] ?? ""} onChange={(event) => setRecordForm((currentForm) => ({ ...currentForm, [field.name]: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-lime-300/50"><option value="">Selecione</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input required={field.required} type={field.type ?? "text"} step={field.type === "number" ? "any" : undefined} value={recordForm[field.name] ?? ""} onChange={(event) => setRecordForm((currentForm) => ({ ...currentForm, [field.name]: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-lime-300/50"/>}</label>)}</div>{recordError && <p role="alert" className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{recordError}</p>}{recordSuccess && <p role="status" className="mt-4 text-xs text-emerald-300">{recordSuccess}</p>}<div className="mt-6 flex justify-end gap-2 border-t border-white/10 pt-4"><button type="button" onClick={() => setShowNewRecord(false)} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-800">Cancelar</button><button disabled={recordBusy} className="rounded-lg bg-lime-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-200 disabled:opacity-60">{recordBusy ? "Salvando…" : "Salvar registro"}</button></div></form></div>}
        <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-9">
          <div className="mb-6 flex flex-col justify-between gap-5 xl:flex-row xl:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime-300/80">Painel operacional</p><h1 className="mt-2 text-2xl font-medium tracking-tight text-zinc-100 sm:text-[28px]">{current === "inicio" ? "Visão geral" : selectedModule?.name}</h1><p className="mt-1.5 text-sm text-zinc-400">{current === "inicio" ? "Acompanhe os principais registros das áreas em um só lugar." : `${selectedModule?.description}.`}</p></div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/50 p-1.5 backdrop-blur-md"><select value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 outline-none transition-colors focus:border-white/20"><option value="todos">Todo o período</option><option value="novembro">Novembro 2026</option><option value="outubro">Outubro 2026</option></select><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nos registros..." aria-label="Buscar nos registros" className="min-w-[175px] flex-1 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-white/20 sm:w-52 sm:flex-none"/><button onClick={exportCsv} className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white">Exportar CSV</button></div>
          </div>

          {current === "inicio" ? <>
            <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-200/80">{dataLoading ? "Carregando registros do Supabase…" : dataError ? `Erro ao consultar o banco: ${dataError}` : authUser ? "Dados do Supabase. Até 500 registros recentes por módulo; a autoria vem do perfil autenticado." : "Prévia de interface: cinco linhas fictícias por módulo. Configure o Supabase para ativar login e dados reais."}</div>
            <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">{kpis.map(([label, value, note, icon]) => <article key={label} className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-md sm:p-5"><div className="flex items-center justify-between"><p className="text-xs text-zinc-400">{label}</p><span className="grid size-8 place-items-center rounded-lg border border-white/5 bg-zinc-800 text-sm text-zinc-300">{icon}</span></div><p className="mt-4 text-2xl font-medium tracking-tight text-zinc-100">{value}</p><p className="mt-1 text-[10px] text-zinc-500">{note}</p></article>)}</div>
            <div className="mb-5 grid gap-4 xl:grid-cols-[1.65fr_.85fr]"><article className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 backdrop-blur-md"><div className="mb-4 flex items-start justify-between"><div><h2 className="text-sm font-medium tracking-tight text-zinc-100">{authUser ? "Resumo dos registros carregados" : "Registros de demonstração"}</h2><p className="mt-1 text-xs text-zinc-500">{authUser ? "A lista e as contagens por módulo vêm do banco; gráfico ilustrativo oculto." : "Distribuição ilustrativa por mês e módulo"}</p></div><div className="flex gap-3 text-[10px] text-zinc-400"><span><i className="mr-1.5 inline-block size-2 rounded-full bg-lime-300/70"/>Outubro</span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-zinc-600"/>Novembro</span></div></div><div className="h-56">{authUser ? <div className="grid h-full place-items-center rounded-lg border border-dashed border-white/10 px-8 text-center text-xs leading-relaxed text-zinc-500">Dados em tempo real carregados nas tabelas abaixo e no resumo por módulo. A agregação mensal do gráfico será habilitada em uma etapa posterior.</div> : <svg viewBox="0 0 720 230" role="img" aria-label="Gráfico fictício de registros por mês" className="h-full w-full"><g stroke="rgba(255,255,255,.08)" strokeWidth="1"><path d="M45 25H700M45 70H700M45 115H700M45 160H700M45 205H700"/></g><g fill="#71717a" fontSize="10"><text x="12" y="28">30</text><text x="12" y="73">20</text><text x="12" y="118">10</text><text x="20" y="208">0</text><text x="78" y="225">Trânsito</text><text x="185" y="225">Etilômetro</text><text x="295" y="225">Veículos</text><text x="408" y="225">Caminhões</text><text x="519" y="225">Metais</text><text x="626" y="225">Equipamentos</text></g><g fill="#a3e635"><rect x="82" y="70" width="25" height="135" rx="4"/><rect x="190" y="91" width="25" height="114" rx="4"/><rect x="298" y="114" width="25" height="91" rx="4"/><rect x="406" y="54" width="25" height="151" rx="4"/><rect x="514" y="103" width="25" height="102" rx="4"/><rect x="622" y="81" width="25" height="124" rx="4"/></g><g fill="#52525b"><rect x="111" y="119" width="25" height="86" rx="4"/><rect x="219" y="130" width="25" height="75" rx="4"/><rect x="327" y="146" width="25" height="59" rx="4"/><rect x="435" y="103" width="25" height="102" rx="4"/><rect x="543" y="138" width="25" height="67" rx="4"/><rect x="651" y="125" width="25" height="80" rx="4"/></g></svg>}</div></article>
              <article className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 backdrop-blur-md"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-sm font-medium tracking-tight text-zinc-100">Volume por módulo</h2><p className="mt-1 text-xs text-zinc-500">{authUser ? "Registros recentes carregados" : "Linhas fictícias disponíveis"}</p></div><span className="rounded-md border border-white/10 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300">{authUser ? viewModules.reduce((n, m) => n + m.rows.length, 0) : 30} registros</span></div><div className="space-y-5">{viewModules.map((module) => <div key={module.id} className="grid grid-cols-[100px_1fr_24px] items-center gap-3 text-[11px]"><span className="truncate text-zinc-400">{module.short}</span><span className="h-1.5 overflow-hidden rounded-full bg-zinc-800"><span className="block h-full w-full rounded-full bg-lime-300/70"/></span><span className="text-right font-medium text-zinc-300">{module.rows.length}</span></div>)}</div></article>
            </div>
            <section className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-md"><div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4"><h2 className="text-sm font-medium tracking-tight text-zinc-100">Atividade recente</h2><span className="text-[10px] text-zinc-500">Exibindo {recentRows.length} de {allRows.length} resultados fictícios</span></div><Table rows={recentRows.map(({ row, module }) => [formatDate(row[0]), module.short, `${row[1]} · ${row[2]}`, row.find((value) => /aprovado|pendente|solucionado|andamento|concluído|positivo|divergência|lacre/i.test(value)) ?? "Registrado", row[row.length - 1]])} fields={["Data", "Área", "Resumo do registro", "Status", "Preenchido por"]}/></section>
            <h2 className="mb-3 mt-7 text-sm font-medium tracking-tight text-zinc-100">Acessar módulos</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{viewModules.map((module) => <button key={module.id} onClick={() => go(module.id)} className="group rounded-xl border border-white/10 bg-zinc-900/50 p-4 text-left backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-zinc-900"><div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-lg border border-white/5 bg-zinc-800 text-sm text-lime-200">{module.icon}</span><span className="rounded-md border border-white/10 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400">{module.rows.length} registros</span></div><h3 className="mt-4 text-sm font-medium tracking-tight text-zinc-100">{module.name}</h3><p className="mt-1 min-h-8 text-xs leading-relaxed text-zinc-500">{module.description}</p><div className="mt-3 flex justify-between border-t border-white/5 pt-3 text-[10px] text-zinc-500"><span>Último registro <b className="font-medium text-zinc-300">{module.rows[0]?.[0] ? formatDate(module.rows[0][0]) : "Sem registros"}</b></span><span className="text-zinc-300 transition-colors group-hover:text-lime-200">Ver registros →</span></div></button>)}</div>
          </> : current === "caminhoes" ? <TruckControl userId={authUser?.id} configured={hasSupabaseConfig}/> : current === "etilometro" ? <BreathalyzerControl userId={authUser?.id} configured={hasSupabaseConfig}/> : current === "metais" ? <MetalControl userId={authUser?.id} configured={hasSupabaseConfig}/> : current === "transito" ? <TrafficControl userId={authUser?.id} configured={hasSupabaseConfig}/> : current === "equipamentos" ? <EquipmentControl userId={authUser?.id} configured={hasSupabaseConfig}/> : current === "veiculos" ? <VehicleControl userId={authUser?.id} configured={hasSupabaseConfig}/> : <>
            <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-200/80">{authUser ? "Registros carregados do Supabase. A autoria corresponde à conta que gravou cada linha." : "Demonstração: cinco registros inventados. Configure o Supabase para habilitar login e leitura do banco."}</div>
            <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">{[["Linhas de exemplo", String(selectedModule?.rows.length ?? 0), authUser ? "Registros recentes" : "Amostra fictícia", "▤"], ["Usuários demo", String(new Set(selectedModule?.rows.map((row) => row[row.length - 1])).size ?? 0), authUser ? "Autores identificados" : "Preenchimento simulado", "♙"], ["Filtro atual", period === "todos" ? "Todo período" : period, "Use busca e período acima", "⌕"], ["Banco de dados", authUser ? "Conectado" : "Demonstração", authUser ? "Dados lidos do Supabase" : "Prévia estática", "◌"]].map(([label, value, note, icon]) => <article key={label} className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-md sm:p-5"><div className="flex items-center justify-between"><p className="text-xs text-zinc-400">{label}</p><span className="grid size-8 place-items-center rounded-lg border border-white/5 bg-zinc-800 text-sm text-zinc-300">{icon}</span></div><p className="mt-4 text-xl font-medium tracking-tight text-zinc-100">{value}</p><p className="mt-1 text-[10px] text-zinc-500">{note}</p></article>)}</div>
            <section className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-md"><div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4"><h2 className="text-sm font-medium tracking-tight text-zinc-100">{selectedModule?.name}</h2><span className="text-[10px] text-zinc-500">Exibindo {selectedModule?.rows.filter((row) => period === "todos" || row[0].toLowerCase().includes(period === "novembro" ? "11" : "10")).filter((row) => !query || row.join(" ").toLowerCase().includes(query.toLowerCase())).length} de {selectedModule?.rows.length} registros</span></div><Table rows={selectedModule?.rows.filter((row) => period === "todos" || row[0].toLowerCase().includes(period === "novembro" ? "11" : "10")).filter((row) => !query || row.join(" ").toLowerCase().includes(query.toLowerCase())) ?? []} fields={selectedModule?.fields ?? []}/></section>
          </>}
          {current !== "equipamentos" && <p className="mt-7 text-center text-[10px] text-zinc-600">{authUser ? "Conectado ao Supabase · Dados protegidos por RLS." : "Demonstração visual · Dados inventados · Configure o Supabase para habilitar a conexão."}</p>}
        </div>
      </main>
    </div>
  </div>;
}

