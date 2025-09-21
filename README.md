# Dispatch Tool

A comprehensive field service management system for roofing companies with region-based queue management.

## 🚀 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Material-UI (MUI)** for components
- **Tailwind CSS** for styling

### Backend
- **Flask** with Python 3.11
- **Flask-SQLAlchemy** for ORM
- **Flask-JWT-Extended** for authentication
- **MySQL** database

### Infrastructure
- **Docker & Docker Compose**
- **Nginx** for production
- Environment-based configuration

## ⚡ Quick Start

### Prerequisites
- Docker and Docker Compose
- jq (for JSON parsing in scripts)
- curl (for API calls)

### Development Setup

1. **Start the application:**
   ```bash
   make dev-bg
   ```

2. **Add test data:**
   ```bash
   ./scripts/add_test_data.sh
   ```

3. **Access the application:**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000
   - **Admin Login**: admin@triguardroofing.com / admin123

### Production Deployment

1. **Update production environment files:**
   - Update `backend/.env.prod` with production values
   - Update `frontend/.env.prod` with production API URL
   - Update `secrets/` files with secure passwords

2. **Deploy:**
   ```bash
   make prod  # or npm run prod
   ```

## 📋 Available Commands

### Make Commands
```bash
make setup     # Install dependencies
make dev       # Start development environment
make dev-bg    # Start development in background
make prod      # Start production environment
make logs      # View development logs
make down      # Stop all containers
make clean     # Clean Docker system
```

### NPM Scripts
```bash
npm run dev            # Start development
npm run prod           # Start production
npm run dev:down       # Stop development
npm run clean          # Clean Docker system
```

## 📁 Project Structure

```
Dispatch_Tool/
├── docs/                       # Documentation
│   ├── SETUP.md               # Complete setup guide
│   ├── CALL_CENTER_API.md     # Call center API documentation
│   ├── DEPLOYMENT.md          # Production deployment guide
│   └── REGION_SYSTEM_IMPLEMENTATION.md # Technical details
├── scripts/                    # Setup and utility scripts
│   ├── add_test_data.sh       # Populate system with test data
│   └── deploy.sh              # Production deployment script
├── frontend/                   # React TypeScript frontend
│   ├── src/                   # Source code
│   └── package.json           # Frontend dependencies
├── backend/                    # Flask Python backend
│   ├── app.py                 # Main application file
│   ├── routes/                # API endpoints
│   └── requirements.txt       # Python dependencies
├── mysql/                      # Database configuration
│   └── init/                  # Database initialization scripts
├── docker-compose.yml         # Development configuration
├── Makefile                   # Development commands
└── README.md                  # This file
```

## 📖 Documentation

- **[Setup Guide](docs/SETUP.md)** - Complete installation and setup instructions
- **[Call Center API](docs/CALL_CENTER_API.md)** - External API documentation for appointment creation
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions
- **[Region System](docs/REGION_SYSTEM_IMPLEMENTATION.md)** - Technical implementation details
- **[Notifications](docs/NOTIFICATIONS.md)** - Environment-aware SMS and email system

## 🎯 Features

- **Region-based Queue Management** - Organize teams and appointments by geographic regions
- **Role-based Access Control** - Admin, Dispatcher, Field Agent, and Call Center roles
- **Real-time Updates** - Live status updates and notifications
- **Call Center API** - External API for appointment creation
- **Comprehensive Dashboard** - Multiple queue views and management interfaces

## ⚙️ Environment Configuration

### Development
- Frontend runs on port **3000** with hot reload
- Backend runs on port **8000** with debug mode
- MySQL runs on port **3306**

### Test Data
The system includes comprehensive test data setup via `scripts/add_test_data.sh`:
- 6 Regions (Global + 5 Texas regions)
- 5 Teams (one per region)
- 14 Users (1 admin + 5 dispatchers + 8 field agents)
- 6 Sample appointments

## 🔒 Security Notes

- Update all passwords in production
- Set proper `SECRET_KEY` and `JWT_SECRET_KEY`
- Use Docker secrets for sensitive data
- Configure firewall rules for EC2 deployment

## 🔄 Development Workflow

1. Make changes to frontend/backend code
2. Changes auto-reload in development mode
3. Test using the available endpoints
4. Use `make logs` to view application logs
5. Use `make down` to stop when done

## 🗄️ Database Management

- **Development**: Access phpMyAdmin at http://localhost:8080
- **Production**: Use secure database management practices
- **Backup**: `make backup` (customize as needed)

## ☁️ Deployment to AWS EC2

1. Launch EC2 instance with Docker installed
2. Clone repository to EC2
3. Update production environment files
4. Run `make prod-bg` to start in background
5. Configure security groups for ports 80 and 443
6. Set up SSL certificates for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.