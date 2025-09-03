# PostgreSQL Setup Guide for GroupChatApp

This guide will help you set up PostgreSQL for local development of the GroupChatApp.

## Step 1: Install PostgreSQL

1. Download PostgreSQL from the official website: https://www.postgresql.org/download/windows/
2. Run the installer and follow the installation wizard
3. When prompted, set a password for the 'postgres' user (remember this password!)
4. Keep the default port (5432)
5. Complete the installation

## Step 2: Verify PostgreSQL Installation

1. Open Command Prompt and run:
   ```
   psql -U postgres
   ```
2. Enter the password you set during installation
3. If you see the PostgreSQL prompt (`postgres=#`), your installation is working
4. Type `\q` to exit the PostgreSQL prompt

## Step 3: Create the Database

1. Open Command Prompt and run:
   ```
   psql -U postgres
   ```
2. Create the database:
   ```sql
   CREATE DATABASE groupchat_db;
   ```
3. Verify the database was created:
   ```sql
   \l
   ```
   You should see 'groupchat_db' in the list
4. Exit the PostgreSQL prompt:
   ```
   \q
   ```

## Step 4: Update Your Environment Variables

1. Make sure your `.env` file has the correct DATABASE_URL:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/groupchat_db?schema=public"
   ```
   - If you set a different password for the 'postgres' user, replace the second 'postgres' with your password

## Step 5: Run Prisma Migrations

1. In the project directory, run:
   ```
   npx prisma migrate dev
   ```
   This will create all necessary tables in your database

## Step 6: Verify Database Connection

1. Run the database check script:
   ```
   npx ts-node check-db.ts
   ```
   If everything is set up correctly, you should see a success message

## Troubleshooting

### PostgreSQL Service Not Running

1. Press Win + R, type `services.msc`, and press Enter
2. Find "postgresql-x64-16" in the list (or similar name depending on your version)
3. Right-click and select "Start"

### Can't Connect to PostgreSQL

1. Check if PostgreSQL is running (see above)
2. Verify your password is correct
3. Make sure the port (5432) is not blocked by a firewall
4. Try restarting the PostgreSQL service

### Prisma Migration Errors

1. If you encounter errors with Prisma migrations, try:
   ```
   npx prisma migrate reset
   ```
   This will reset the database and apply all migrations from scratch

### Database Exists But Tables Are Missing

1. Run:
   ```
   npx prisma db push
   ```
   This will push the schema to the database without creating migrations
