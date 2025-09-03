@echo off
echo Testing connection to local PostgreSQL server...

where psql > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo PostgreSQL command-line tools not found in PATH.
    echo Please install PostgreSQL or add it to your PATH.
    exit /b 1
)

echo Attempting to connect to PostgreSQL server on localhost:5432...
psql -U postgres -h localhost -p 5432 -c "SELECT version();" 2> nul

if %ERRORLEVEL% NEQ 0 (
    echo Failed to connect to PostgreSQL server.
    echo.
    echo Possible reasons:
    echo 1. PostgreSQL service is not running
    echo 2. PostgreSQL is not installed
    echo 3. The PostgreSQL server is running on a different port
    echo 4. Authentication failed
    echo.
    echo Recommended actions:
    echo - Check if PostgreSQL service is running in Services
    echo - If installed, start PostgreSQL service
    echo - If not installed, download and install PostgreSQL from https://www.postgresql.org/download/windows/
    echo - Check your PostgreSQL configuration
    exit /b 1
) else (
    echo Successfully connected to PostgreSQL server!
    echo.
    echo Now checking if database 'groupchat_db' exists...
    psql -U postgres -h localhost -p 5432 -lqt | find "groupchat_db" > nul
    
    if %ERRORLEVEL% NEQ 0 (
        echo Database 'groupchat_db' does not exist.
        echo Run setup-local-db.bat to create it.
    ) else (
        echo Database 'groupchat_db' exists.
        echo Your database connection should be working.
        echo Check your DATABASE_URL in .env file:
        echo - It should be: postgresql://postgres:postgres@localhost:5432/groupchat_db?schema=public
    )
)

echo.
echo Test completed.
