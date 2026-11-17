"use client";

import { useMemo, useState } from "react";

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
  const selectedModule = modules.find((module) => module.id === current);
  const allRows = useMemo(() => modules.flatMap((module) => module.rows
    .filter((row) => (period === "todos" || row[0].toLowerCase().includes(period === "novembro" ? "11" : "10"))
      && (!query || `${module.name} ${row.join(" ")}`.toLowerCase().includes(query.toLowerCase())))
    .map((row) => ({ module, row }))), [period, query]);
  const recentRows = [...allRows].sort((a, b) => b.row[0].localeCompare(a.row[0])).slice(0, 8);

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

  const navItems = [{ id: "inicio", name: "Visão geral", icon: "▦" }, ...modules.map(({ id, short, icon }) => ({ id, name: short, icon }))];
  const kpis = [["Registros demonstrativos", "30", "5 por módulo", "▤"], ["Áreas integradas", "6", "Módulos no portal", "▦"], ["Usuários de exemplo", "4", "Autoria identificada nos exemplos", "♙"], ["Período da amostra", "Out–Nov", "Datas fictícias de 2026", "◷"]];

  return <div className="min-h-screen bg-zinc-950 text-zinc-100">
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="border-b border-white/10 bg-zinc-950 p-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-b-0 lg:p-5">
        <div className="flex items-center gap-3 px-1"><div className="grid size-10 place-items-center rounded-xl border border-white/10 bg-zinc-800 font-semibold text-lime-300">OP</div><div><p className="text-sm font-medium tracking-tight text-zinc-100">Operação Integrada</p><p className="mt-0.5 text-[10px] tracking-[0.14em] text-zinc-500">CAJATI · DEMONSTRAÇÃO</p></div></div>
        <p className="mb-2 mt-7 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600 lg:block">Workspace</p>
        <nav className="mt-4 flex gap-1 overflow-x-auto pb-1 lg:mt-0 lg:flex-col lg:overflow-visible">{navItems.map((item) => <button key={item.id} onClick={() => go(item.id)} className={`flex shrink-0 items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${current === item.id ? "border-white/10 bg-zinc-900 text-zinc-100" : "border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"}`}><span className="w-4 text-center text-zinc-500">{item.icon}</span>{item.name}</button>)}</nav>
        <div className="mt-auto hidden space-y-3 pt-8 lg:block"><div className="rounded-xl border border-white/10 bg-zinc-900/50 p-3 backdrop-blur-md"><p className="text-xs font-medium text-zinc-200">Ambiente demonstrativo</p><p className="mt-1 text-[11px] leading-relaxed text-zinc-500">Registros inventados. Nenhuma planilha foi importada.</p></div><div className="flex items-center gap-3 border-t border-white/10 px-1 pt-4"><div className="grid size-8 place-items-center rounded-full border border-white/10 bg-zinc-800 text-xs font-medium text-zinc-300">AD</div><div><p className="text-xs font-medium text-zinc-200">Administrador demo</p><p className="text-[10px] text-zinc-500">Visualização sem login</p></div></div></div>
      </aside>

      <main className="min-w-0">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/10 bg-zinc-950/80 px-4 backdrop-blur-xl sm:px-7"><p className="text-xs text-zinc-500">Operação <span className="px-1.5 text-zinc-700">/</span><span className="text-zinc-300">{current === "inicio" ? "Visão geral" : selectedModule?.name}</span></p><div className="flex items-center gap-3"><span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-1 text-[10px] font-medium text-zinc-300">● Dados de exemplo</span><div className="grid size-8 place-items-center rounded-full border border-white/10 bg-zinc-800 text-[10px] font-semibold text-zinc-300">AD</div></div></header>
        <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-9">
          <div className="mb-6 flex flex-col justify-between gap-5 xl:flex-row xl:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime-300/80">Painel operacional</p><h1 className="mt-2 text-2xl font-medium tracking-tight text-zinc-100 sm:text-[28px]">{current === "inicio" ? "Visão geral" : selectedModule?.name}</h1><p className="mt-1.5 text-sm text-zinc-400">{current === "inicio" ? "Acompanhe os principais registros das áreas em um só lugar." : `${selectedModule?.description}.`}</p></div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/50 p-1.5 backdrop-blur-md"><select value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 outline-none transition-colors focus:border-white/20"><option value="todos">Todo o período</option><option value="novembro">Novembro 2026</option><option value="outubro">Outubro 2026</option></select><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nos registros..." aria-label="Buscar nos registros" className="min-w-[175px] flex-1 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-white/20 sm:w-52 sm:flex-none"/><button onClick={exportCsv} className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white">Exportar CSV</button></div>
          </div>

          {current === "inicio" ? <>
            <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-200/80">Prévia de interface: cinco linhas fictícias por módulo. O painel não está conectado a login ou banco de dados.</div>
            <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">{kpis.map(([label, value, note, icon]) => <article key={label} className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-md sm:p-5"><div className="flex items-center justify-between"><p className="text-xs text-zinc-400">{label}</p><span className="grid size-8 place-items-center rounded-lg border border-white/5 bg-zinc-800 text-sm text-zinc-300">{icon}</span></div><p className="mt-4 text-2xl font-medium tracking-tight text-zinc-100">{value}</p><p className="mt-1 text-[10px] text-zinc-500">{note}</p></article>)}</div>
            <div className="mb-5 grid gap-4 xl:grid-cols-[1.65fr_.85fr]"><article className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 backdrop-blur-md"><div className="mb-4 flex items-start justify-between"><div><h2 className="text-sm font-medium tracking-tight text-zinc-100">Registros de demonstração</h2><p className="mt-1 text-xs text-zinc-500">Distribuição ilustrativa por mês e módulo</p></div><div className="flex gap-3 text-[10px] text-zinc-400"><span><i className="mr-1.5 inline-block size-2 rounded-full bg-lime-300/70"/>Outubro</span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-zinc-600"/>Novembro</span></div></div><div className="h-56"><svg viewBox="0 0 720 230" role="img" aria-label="Gráfico fictício de registros por mês" className="h-full w-full"><g stroke="rgba(255,255,255,.08)" strokeWidth="1"><path d="M45 25H700M45 70H700M45 115H700M45 160H700M45 205H700"/></g><g fill="#71717a" fontSize="10"><text x="12" y="28">30</text><text x="12" y="73">20</text><text x="12" y="118">10</text><text x="20" y="208">0</text><text x="78" y="225">Trânsito</text><text x="185" y="225">Etilômetro</text><text x="295" y="225">Veículos</text><text x="408" y="225">Caminhões</text><text x="519" y="225">Metais</text><text x="626" y="225">Equipamentos</text></g><g fill="#a3e635"><rect x="82" y="70" width="25" height="135" rx="4"/><rect x="190" y="91" width="25" height="114" rx="4"/><rect x="298" y="114" width="25" height="91" rx="4"/><rect x="406" y="54" width="25" height="151" rx="4"/><rect x="514" y="103" width="25" height="102" rx="4"/><rect x="622" y="81" width="25" height="124" rx="4"/></g><g fill="#52525b"><rect x="111" y="119" width="25" height="86" rx="4"/><rect x="219" y="130" width="25" height="75" rx="4"/><rect x="327" y="146" width="25" height="59" rx="4"/><rect x="435" y="103" width="25" height="102" rx="4"/><rect x="543" y="138" width="25" height="67" rx="4"/><rect x="651" y="125" width="25" height="80" rx="4"/></g></svg></div></article>
              <article className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 backdrop-blur-md"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-sm font-medium tracking-tight text-zinc-100">Volume por módulo</h2><p className="mt-1 text-xs text-zinc-500">Linhas fictícias disponíveis</p></div><span className="rounded-md border border-white/10 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300">30 amostras</span></div><div className="space-y-5">{modules.map((module) => <div key={module.id} className="grid grid-cols-[100px_1fr_24px] items-center gap-3 text-[11px]"><span className="truncate text-zinc-400">{module.short}</span><span className="h-1.5 overflow-hidden rounded-full bg-zinc-800"><span className="block h-full w-full rounded-full bg-lime-300/70"/></span><span className="text-right font-medium text-zinc-300">5</span></div>)}</div></article>
            </div>
            <section className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-md"><div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4"><h2 className="text-sm font-medium tracking-tight text-zinc-100">Atividade recente</h2><span className="text-[10px] text-zinc-500">Exibindo {recentRows.length} de {allRows.length} resultados fictícios</span></div><Table rows={recentRows.map(({ row, module }) => [formatDate(row[0]), module.short, `${row[1]} · ${row[2]}`, row.find((value) => /aprovado|pendente|solucionado|andamento|concluído|positivo|divergência|lacre/i.test(value)) ?? "Registrado", row[row.length - 1]])} fields={["Data", "Área", "Resumo do registro", "Status", "Preenchido por"]}/></section>
            <h2 className="mb-3 mt-7 text-sm font-medium tracking-tight text-zinc-100">Acessar módulos</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{modules.map((module) => <button key={module.id} onClick={() => go(module.id)} className="group rounded-xl border border-white/10 bg-zinc-900/50 p-4 text-left backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-zinc-900"><div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-lg border border-white/5 bg-zinc-800 text-sm text-lime-200">{module.icon}</span><span className="rounded-md border border-white/10 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400">5 amostras</span></div><h3 className="mt-4 text-sm font-medium tracking-tight text-zinc-100">{module.name}</h3><p className="mt-1 min-h-8 text-xs leading-relaxed text-zinc-500">{module.description}</p><div className="mt-3 flex justify-between border-t border-white/5 pt-3 text-[10px] text-zinc-500"><span>Último exemplo <b className="font-medium text-zinc-300">{formatDate(module.rows[0][0])}</b></span><span className="text-zinc-300 transition-colors group-hover:text-lime-200">Ver registros →</span></div></button>)}</div>
          </> : <>
            <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-200/80">Demonstração: cinco registros inventados neste módulo. “Preenchido por” é uma autoria simulada; não há autenticação nesta versão.</div>
            <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">{[["Linhas de exemplo", String(selectedModule?.rows.length ?? 0), "Amostra fictícia", "▤"], ["Usuários demo", String(new Set(selectedModule?.rows.map((row) => row[row.length - 1])).size ?? 0), "Preenchimento simulado", "♙"], ["Filtro atual", period === "todos" ? "Todo período" : period, "Use busca e período acima", "⌕"], ["Banco de dados", "Não conectado", "Prévia estática", "◌"]].map(([label, value, note, icon]) => <article key={label} className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-md sm:p-5"><div className="flex items-center justify-between"><p className="text-xs text-zinc-400">{label}</p><span className="grid size-8 place-items-center rounded-lg border border-white/5 bg-zinc-800 text-sm text-zinc-300">{icon}</span></div><p className="mt-4 text-xl font-medium tracking-tight text-zinc-100">{value}</p><p className="mt-1 text-[10px] text-zinc-500">{note}</p></article>)}</div>
            <section className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-md"><div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4"><h2 className="text-sm font-medium tracking-tight text-zinc-100">{selectedModule?.name}</h2><span className="text-[10px] text-zinc-500">Exibindo {selectedModule?.rows.filter((row) => period === "todos" || row[0].toLowerCase().includes(period === "novembro" ? "11" : "10")).filter((row) => !query || row.join(" ").toLowerCase().includes(query.toLowerCase())).length} de {selectedModule?.rows.length} linhas fictícias</span></div><Table rows={selectedModule?.rows.filter((row) => period === "todos" || row[0].toLowerCase().includes(period === "novembro" ? "11" : "10")).filter((row) => !query || row.join(" ").toLowerCase().includes(query.toLowerCase())) ?? []} fields={selectedModule?.fields ?? []}/></section>
          </>}
          <p className="mt-7 text-center text-[10px] text-zinc-600">Demonstração visual · Dados inventados · Sem login, gravação ou conexão com as planilhas.</p>
        </div>
      </main>
    </div>
  </div>;
}
