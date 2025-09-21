# Dispatch Tool V3

A full-stack dispatch management application built with React, Flask, and MySQL.

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
- Node.js 20+ (for local development)
- Make (optional, for convenience commands)

### Development Setup

1. **Clone and setup:**
   ```bash
   git clone https://github.com/Saher-Anwar/Dispatch_Tool_V3.git
   cd Dispatch_Tool_V3
   make setup  # or npm run setup
   ```

2. **Start development environment:**
   ```bash
   make dev  # or npm run dev
   ```

3. **Access the application:**
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:5000
   - **Database Admin**: http://localhost:8080 (phpMyAdmin)

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
Dispatch_Tool_V3/
├── frontend/                    # React frontend
│   ├── src/                    # Source code
│   ├── Dockerfile              # Frontend Docker config
│   ├── nginx.conf              # Production nginx config
│   └── package.json            # Frontend dependencies
├── backend/                    # Flask backend
│   ├── app.py                  # Main application file
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile              # Backend Docker config
├── mysql/                      # Database configuration
│   └── init/                   # Database initialization scripts
├── secrets/                    # Production secrets (not in git)
├── docker-compose.dev.yml      # Development configuration
├── docker-compose.prod.yml     # Production configuration
├── Makefile                    # Development commands
└── README.md                   # Documentation
```

## ⚙️ Environment Configuration

### Development
- Frontend runs on port **5173** with hot reload
- Backend runs on port **5000** with debug mode
- MySQL runs on port **3307** with phpMyAdmin on **8080**

### Production
- Frontend served by Nginx on port **80**
- Backend runs with Gunicorn on port **5000**
- MySQL with secure password management
- All services auto-restart on failure

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