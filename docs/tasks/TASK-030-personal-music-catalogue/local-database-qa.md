# Reproducing isolated database QA

Executed locally on 2026-09-11 using Supabase CLI 2.84.2 and PostgreSQL 17.6.
The two disposable databases already exist after this run. Reuse an existing
clone for rollback-only suites, or choose an unused disposable name for replay.
Never target the active `postgres` database or a hosted database for writes.
Docker access required sandbox escalation because of the Windows pipe ACL.

The sequence below records the schema-only replay procedure with an explicit
unused-name guard. It copies definitions and grants, not accounts or history.

```powershell
$task030Container = 'supabase_db_mistake-watch-task028'
$task030Database = 'task030_catalogue_replay'
$task030Exists = docker exec $task030Container psql -U postgres -d postgres -At -c "select datname from pg_database where datname='$task030Database';"
if ($LASTEXITCODE -ne 0 -or $task030Exists) { throw 'Target must be an unused disposable database' }

New-Item -ItemType Directory -Path .tmp/task030 -Force | Out-Null
$task030Schema = docker exec $task030Container pg_dump -U postgres -d postgres --schema-only --schema=auth --schema=public --schema=private --no-owner
if ($LASTEXITCODE -ne 0) { throw 'Schema export failed' }
$task030Schema | Set-Content .tmp/task030/baseline-schema.sql
docker exec $task030Container createdb -U postgres $task030Database
if ($LASTEXITCODE -ne 0) { throw 'Disposable database creation failed' }
docker exec $task030Container psql -U postgres -d $task030Database -v ON_ERROR_STOP=1 -q -c 'create schema extensions; create extension pgcrypto with schema extensions; create extension "uuid-ossp" with schema extensions; create extension pgtap with schema extensions;'
if ($LASTEXITCODE -ne 0) { throw 'Extension setup failed' }

# Local postgres cannot restore other Supabase roles' default privileges.
# Object grants and postgres defaults remain; migration grants are explicit.
$task030Schema = Get-Content .tmp/task030/baseline-schema.sql |
  Where-Object { $_ -notmatch '^ALTER DEFAULT PRIVILEGES FOR ROLE (supabase_admin|supabase_auth_admin)' }
$task030Schema = ($task030Schema -join "`n").
  Replace('CREATE SCHEMA auth;', 'CREATE SCHEMA IF NOT EXISTS auth;').
  Replace('CREATE SCHEMA public;', 'CREATE SCHEMA IF NOT EXISTS public;').
  Replace('CREATE SCHEMA private;', 'CREATE SCHEMA IF NOT EXISTS private;')
$task030Schema | docker exec -i $task030Container psql -U postgres -d $task030Database -v ON_ERROR_STOP=1 -q
if ($LASTEXITCODE -ne 0) { throw 'Schema restore failed' }
docker exec $task030Container psql -U postgres -d $task030Database -At -c 'select count(*) from auth.users; select count(*) from public.rooms;'
# Both counts must be zero before proceeding.

Get-Content supabase/migrations/20260911055006_personal_music_catalogue.sql -Raw |
  docker exec -i $task030Container psql -U postgres -d $task030Database -v ON_ERROR_STOP=1 -1 -q
if ($LASTEXITCODE -ne 0) { throw 'Migration failed' }
Get-Content supabase/tests/database/music-catalogue.test.sql -Raw |
  docker exec -i $task030Container psql -U postgres -d $task030Database -v ON_ERROR_STOP=1 -q -At
```

If the active local schema later includes TASK-030, obtain the pre-TASK-030
schema before replay; do not apply the migration twice and call that a clean
replay. Successful `psql` exit alone does not prove pgTAP success: inspect every
assertion for `not ok` and verify the final plan. The new suite passed 77.

Schema-only cloning omits feature configuration rows. Existing regression
suites used these synthetic defaults; all test fixtures roll back:

```powershell
docker exec $task030Container psql -U postgres -d $task030Database -v ON_ERROR_STOP=1 -q -c "insert into private.room_kind_features(room_kind,enabled) values('personal',false),('shared',false),('themed',false),('temporary',false) on conflict do nothing; insert into private.recommendation_learning_versions values(1,clock_timestamp()) on conflict do nothing; grant usage on schema extensions to service_role,anon,authenticated;"
$task030Suites = @('personal-discover', 'learning-policy', 'audit-corrections', 'temporary-room', 'shared-withdrawal', 'personal-room', 'persistent-retirement')
foreach ($task030Suite in $task030Suites) {
  Get-Content "supabase/tests/database/$task030Suite.test.sql" -Raw |
    docker exec -i $task030Container psql -U postgres -d $task030Database -v ON_ERROR_STOP=1 -q -At
  if ($LASTEXITCODE -ne 0) { throw "SQL execution failed: $task030Suite" }
}
```

The seven existing suites passed 239 assertions. Concurrency used the separately
created `task030_catalogue` schema-only clone. This script refuses other database
names and cleans up its synthetic accounts/sources:

```powershell
$env:CATALOGUE_QA_DATABASE = 'task030_catalogue'
node scripts/qa/catalogue-concurrency.mjs
```

For the final CLI checks, provide the local replay database URL through
`TASK030_QA_DB_URL` without printing it. It must address `127.0.0.1:55422` and
database `task030_catalogue_replay`, using local development credentials.

```powershell
& 'C:\Users\Admin\scoop\shims\supabase.exe' db advisors --db-url $env:TASK030_QA_DB_URL --level warn --type all --output json
& 'C:\Users\Admin\scoop\shims\supabase.exe' db lint --db-url $env:TASK030_QA_DB_URL --schema public,private --level error --output json
```

Advisors reported no issues; public/private function lint reported no errors.
See [review evidence](review-notes.md) for scope, chronology and release limits.
