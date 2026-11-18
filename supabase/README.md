# Banco de dados do Painel Operacional

## O que esta migração cria

- Perfil e papéis `admin`, `supervisor`, `operator` e `viewer`.
- Tabelas operacionais para trânsito, etilômetro, quilometragem, abastecimento, pesagem de caminhões, detector de metais e indisponibilidade de equipamentos.
- RLS: leitura para usuários autenticados; inclusão para operador/supervisor/admin; edição pelo autor ou supervisor/admin; exclusão somente pelo admin.
- `created_by` e `updated_by` preenchidos no servidor com o usuário autenticado; registros importados podem manter autor desconhecido (`NULL`).
- Histórico de inclusões/edições/exclusões em `audit_log`.

## Aplicação

1. Crie um projeto no Supabase e abra **SQL Editor**.
2. Execute `migrations/202611170001_initial_schema.sql`.
3. Em **Authentication**, prefira cadastro por convite/desative cadastro público antes de disponibilizar o sistema.
4. Convide o primeiro usuário, então promova-o uma única vez no SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'seu-email@exemplo.com');
```

5. Cadastre/convide os usuários restantes. Novos perfis começam como `viewer`; um administrador pode alterar os papéis pela função `public.set_user_role(id, papel)` ou diretamente no SQL Editor.
6. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no `.env.local` e no ambiente de deploy. Nunca use a `service_role` no navegador.

## Observações sobre planilhas existentes

Esta migração não importa registros nem usa os conteúdos atuais das planilhas. Campos de autor das linhas históricas devem permanecer nulos, pois os arquivos não identificam com segurança quem digitou cada linha. Motorista, vigilante ou inspetor são campos de negócio e não substituem o usuário que registrou o dado.

As tabelas foram modeladas a partir dos cabeçalhos das planilhas disponíveis. Recomenda-se validar campos opcionais e regras de negócio com usuários do processo antes da carga histórica.


## Módulo de controle de equipamentos

Depois de aplicar a migração inicial, execute também `migrations/202611170002_equipment_control.sql` no SQL Editor. Ela cria cadastros de setores, categorias, equipamentos e tipos de falha, além das regras para calcular indisponibilidade, meta de reparo, atraso e status das ocorrências.

No site, comece por **Cadastro → Setores e Categorias**, depois cadastre os equipamentos e tipos de falha. A tela de lançamentos usa esses cadastros e vincula automaticamente a autoria ao usuário autenticado. O dashboard e os relatórios são calculados com os dados do banco; nenhuma linha histórica do Excel é importada por essa migração.
