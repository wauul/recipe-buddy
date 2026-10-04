$ErrorActionPreference = 'Stop'
$taskEnvPath = Join-Path (Get-Location) '.env.meal-test'
if (Test-Path -LiteralPath $taskEnvPath) { throw 'Existing meal test configuration preserved. Use it explicitly.' }
$taskPassword = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
$taskSecret = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$taskValues = @("DATABASE_URL=postgresql://meal_test:$taskPassword@127.0.0.1:55433/recipe_buddy_meal_test", 'NEXTAUTH_URL=http://localhost:3003', "NEXTAUTH_SECRET=$taskSecret", "NATIVE_SESSION_SECRET=$taskSecret", 'GROQ_API_KEY=', 'VISION_ENABLED=false', 'VERCEL_ENV=preview')
[System.IO.File]::WriteAllLines($taskEnvPath, $taskValues)
$env:POSTGRES_PASSWORD = $taskPassword
docker run --detach --name recipe-buddy-meal-test --publish 127.0.0.1:55433:5432 --env POSTGRES_USER=meal_test --env POSTGRES_PASSWORD --env POSTGRES_DB=recipe_buddy_meal_test postgres:16
Remove-Item Env:POSTGRES_PASSWORD
if ($LASTEXITCODE -ne 0) { throw 'Test database startup failed; configuration preserved.' }
