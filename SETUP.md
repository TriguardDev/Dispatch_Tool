# Dispatch Tool - Initial Setup Guide

## Fresh Installation Process

After removing all sample data from SQL files, follow these steps to set up your system:

### 1. Start the Application

First, start the application with fresh database:

```bash
# Start the application (this creates empty database with only admin user)
make dev-bg

# Wait for all services to be ready (usually 30-60 seconds)
```

### 2. Run Initial Data Setup

Execute the automated setup script to populate the system via API calls:

```bash
# Run the initial data setup script
./setup_initial_data.sh
```

This script will automatically:

1. **Wait for API service** to be ready
2. **Login as admin** using the default admin credentials
3. **Create regions** (North Texas, South Texas, East Texas, West Texas, Central Texas)
4. **Create teams** and assign them to appropriate regions
5. **Create dispatchers** and assign them to teams
6. **Create field agents** and assign them to teams
7. **Create sample appointments** via the call center API

### 3. System Structure Created

After running the setup script, your system will have:

#### **Regions** (6 total)
- Global (created by SQL migration)
- North Texas
- South Texas  
- East Texas
- West Texas
- Central Texas

#### **Teams** (5 total)
- Team Alpha → North Texas
- Team Beta → South Texas
- Team Gamma → East Texas
- Team Delta → West Texas
- Team Echo → Central Texas

#### **Users** (14 total)
- **1 Admin**: admin@triguardroofing.com / admin123
- **5 Dispatchers** (one per team):
  - Pete Stathopoulos → Team Alpha
  - Maria Rodriguez → Team Beta
  - James Wilson → Team Gamma
  - Sarah Johnson → Team Delta
  - Michael Chen → Team Echo
- **8 Field Agents** (distributed across teams):
  - Larey Farias, Arthur Garcia → Team Alpha
  - Jeremy Moreno, Rebecca Stewart → Team Beta
  - David Thompson → Team Gamma
  - Lisa Chen → Team Delta
  - Robert Johnson, Jennifer Wilson → Team Echo

#### **Sample Appointments** (6 total)
- One appointment in each region (including Global)
- All unassigned, ready for dispatcher assignment
- Various Texas locations (McKinney, McAllen, Tyler, El Paso, Austin, Dallas)

### 4. Login Credentials

You can now login with any of these credentials:

**Admin Access:**
- Email: `admin@triguardroofing.com`
- Password: `admin123`

**Dispatcher Access:**
- Email: `pete@example.com` / Password: `pete123`
- Email: `maria@example.com` / Password: `maria123`
- Email: `james@example.com` / Password: `james123`
- Email: `sarah@example.com` / Password: `sarah123`
- Email: `michael@example.com` / Password: `michael123`

**Field Agent Access:**
- Email: `larey@example.com` / Password: `larey123`
- Email: `arthur@example.com` / Password: `arthur123`
- Email: `jeremy@example.com` / Password: `jeremy123`
- Email: `rebecca@example.com` / Password: `rebecca123`
- Email: `david@example.com` / Password: `david123`
- Email: `lisa@example.com` / Password: `lisa123`
- Email: `robert@example.com` / Password: `robert123`
- Email: `jennifer@example.com` / Password: `jennifer123`

## Troubleshooting

### Script Fails to Run

1. **Check dependencies:**
   ```bash
   # Install jq if missing (for JSON parsing)
   sudo apt-get install jq  # Ubuntu/Debian
   brew install jq          # macOS
   
   # curl should already be installed
   ```

2. **Check if services are running:**
   ```bash
   docker-compose ps
   ```

3. **Check API service health:**
   ```bash
   curl http://localhost:8000/api/health
   ```

### API Calls Failing

1. **Check if admin login works:**
   ```bash
   curl -X POST "http://localhost:8000/api/login" \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@triguardroofing.com", "password": "admin123", "role": "admin"}'
   ```

2. **Check database connectivity:**
   ```bash
   docker-compose logs mysql
   docker-compose logs backend
   ```

### Partial Setup Completion

If the script fails partway through, you can:

1. **Reset the database:**
   ```bash
   make dev-down
   docker volume rm dispatch_tool_mysql_data
   make dev-bg
   ```

2. **Re-run the setup script:**
   ```bash
   ./setup_initial_data.sh
   ```

## Customization

To customize the initial data:

1. **Edit the script** `setup_initial_data.sh`
2. **Modify the data arrays** for regions, teams, dispatchers, agents, or appointments
3. **Re-run the script** after resetting the database

## Manual API Testing

You can also manually create data using the APIs:

```bash
# Login as admin
curl -X POST "http://localhost:8000/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@triguardroofing.com", "password": "admin123", "role": "admin"}' \
  --cookie-jar cookies.txt

# Create a region
curl -X POST "http://localhost:8000/api/regions" \
  -H "Content-Type: application/json" \
  --cookie cookies.txt \
  -d '{"name": "Test Region", "description": "Test region", "is_global": false}'

# Create a team
curl -X POST "http://localhost:8000/api/teams" \
  -H "Content-Type: application/json" \
  --cookie cookies.txt \
  -d '{"name": "Test Team", "description": "Test team", "region_id": 2}'
```

See the `setup_initial_data.sh` script for more API examples.