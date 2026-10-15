-- READ ONLY. Run in a test project's SQL editor before production verification.
select schemaname, tablename, rowsecurity
from pg_tables where schemaname = 'public' and tablename = 'workbench_state';
select policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'workbench_state';
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name='workbench_state'
order by ordinal_position;
-- Required: user_id unique/PK, authenticated-only owner predicates on SELECT,
-- INSERT WITH CHECK and UPDATE USING/WITH CHECK: auth.uid() = user_id.
-- A read-only audit cannot establish that actual account isolation works.
-- Verify with two TEST users: each may read/update its own row only; the other
-- user's row must be invisible; unauthenticated writes must fail. No service key.
