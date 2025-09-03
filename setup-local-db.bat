@echo off
echo This script will help you set up your local PostgreSQL database for the GroupChatApp

echo Checking if PostgreSQL is installed...
where psql > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo PostgreSQL is not installed or not in your PATH.
    echo Please install PostgreSQL from https://www.postgresql.org/download/windows/
    echo Make sure to add it to your PATH during installation.
    exit /b 1
)

echo PostgreSQL is installed.

echo Creating database 'groupchat_db'...
psql -U postgres -c "CREATE DATABASE groupchat_db;" || (
    echo Failed to create database. The database might already exist or there might be connection issues.
    echo If the database already exists, you can proceed.
    echo If you're having connection issues, check that PostgreSQL is running and accessible.
)

echo Setting up database user 'postgres' with password 'postgres'...
psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';" || (
    echo Failed to set up database user.
    echo You may need to modify the .env file to match your PostgreSQL configuration.
)

echo Setting up schema...
cd %~dp0
call npx prisma migrate dev --name init || (
    echo Failed to run migrations.
    echo Check your database connection and try again.
    exit /b 1
)

echo Database setup completed successfully.
echo You can now run 'npm run dev' to start the application.
