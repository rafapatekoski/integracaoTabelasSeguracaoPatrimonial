# Integração de Tabelas — Segurança Patrimonial

Protótipo estático de um painel operacional integrado. A interface usa somente dados fictícios para demonstrar módulos, busca, filtro por período e exportação CSV.

## Módulos demonstrados

- Indicadores de trânsito
- Etilômetro
- Quilometragem e abastecimento
- Inspeção de caminhões
- Detector de metais
- Equipamentos offline

Cada módulo contém cinco registros de exemplo e uma coluna de autoria simulada. Não há login, banco de dados nem persistência de alterações.

## Executar

Abra `index.html` em um navegador. O projeto não exige instalação de dependências ou etapa de build.

## Próximas etapas

- Migrar os dados para um banco PostgreSQL
- Implementar autenticação e perfis de acesso
- Registrar automaticamente autor, data de criação e histórico de alterações
- Importar e validar os dados históricos das planilhas
