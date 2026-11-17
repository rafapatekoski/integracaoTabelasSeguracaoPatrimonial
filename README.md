# Painel Operacional — Segurança Patrimonial

Demonstração de um painel integrado em Next.js, React e Tailwind CSS. Todos os dados são inventados e servem apenas para testar a interface.

## Módulos

- Indicadores de trânsito
- Etilômetro
- Quilometragem e abastecimento
- Inspeção de caminhões
- Detector de metais
- Equipamentos offline

Cada módulo exibe cinco linhas fictícias e uma autoria simulada. O painel geral reúne indicadores, gráfico, atividade recente e atalhos. Inclui busca, filtro por período e exportação CSV. A autenticação por e-mail/senha e a leitura dos registros usam Supabase quando as variáveis de ambiente estão configuradas. Sem configuração, a interface permanece em modo de demonstração.

## Conectar ao Supabase

1. Aplique a migração em `supabase/migrations/202611170001_initial_schema.sql` pelo SQL Editor do Supabase.
2. Copie `.env.example` para `.env.local` e preencha a URL do projeto e a chave pública (`publishable key`).
3. Configure as mesmas variáveis no projeto Vercel e faça um novo deployment.
4. Crie/convide os usuários em Supabase Authentication; o painel não oferece cadastro público.

Quando conectado, o painel exige login e consulta até 500 registros recentes por módulo. A autoria é associada a `profiles` via `created_by`. A interface ainda não inclui formulários de criação/edição; os dados existentes são exibidos e podem ser exportados em CSV.

## Executar localmente

Requer Node.js 20.9 ou superior.

```bash
npm install
npm run dev
``

Abra http://localhost:3000. Para gerar a versão de produção, use `npm run build`.

## Publicar na Vercel

Importe este repositório na Vercel. O framework deve ser detectado como Next.js; mantenha a pasta raiz como diretório do projeto e use o comando padrão de build. Cada push na branch principal poderá iniciar um novo deployment.
