# Painel Operacional — Segurança Patrimonial

Demonstração de um painel integrado em Next.js, React e Tailwind CSS. Todos os dados são inventados e servem apenas para testar a interface.

## Módulos

- Indicadores de trânsito
- Etilômetro
- Quilometragem e abastecimento
- Inspeção de caminhões
- Detector de metais
- Equipamentos offline

Cada módulo exibe cinco linhas fictícias e uma autoria simulada. O painel geral reúne indicadores, gráfico, atividade recente e atalhos. Inclui busca, filtro por período e exportação CSV. Ainda não há autenticação, banco de dados nem gravação de alterações.

## Executar localmente

Requer Node.js 20.9 ou superior.

```bash
npm install
npm run dev
``

Abra http://localhost:3000. Para gerar a versão de produção, use `npm run build`.

## Publicar na Vercel

Importe este repositório na Vercel. O framework deve ser detectado como Next.js; mantenha a pasta raiz como diretório do projeto e use o comando padrão de build. Cada push na branch principal poderá iniciar um novo deployment.
