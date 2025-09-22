# 🚀 CI/CD Deployment Setup

This guide will help you set up automatic deployment to EC2 when PRs are merged to master.

## 📋 Prerequisites

- EC2 instance running with Docker installed
- GitHub repository with Actions enabled
- SSH key pair for EC2 access

## ⚙️ Setup Steps

### 1. **Configure GitHub Secrets**

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these repository secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `EC2_HOST` | `100.29.86.99` | Your EC2 public IP address |
| `EC2_USERNAME` | `ubuntu` | EC2 username (usually `ubuntu` for Ubuntu AMI) |
| `EC2_SSH_KEY` | `-----BEGIN RSA PRIVATE KEY-----...` | Your private SSH key content |

### 2. **Get Your SSH Private Key**

On your local machine where you have the EC2 key pair:

```bash
# Display your private key
cat ~/.ssh/your-ec2-key.pem

# Copy the entire output including the BEGIN and END lines
```

Paste this entire content (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`) into the `EC2_SSH_KEY` secret.

### 3. **Ensure EC2 is Ready**

On your EC2 instance, make sure:

```bash
# Project is cloned in home directory
cd ~/Dispatch_Tool_V3

# Make is installed
sudo apt install make -y

# Docker is running
sudo systemctl start docker
sudo systemctl enable docker

# User can run docker without sudo
sudo usermod -aG docker $USER
# Logout and login again for this to take effect
```

## 🔄 How It Works

### Trigger Events
- **Push to master branch** → Runs CI/CD
- **PR merged to master** → Runs CI/CD

### Pipeline Stages

#### 1. **Test Stage**
- ✅ Install Node.js 20 and Python 3.11
- ✅ Install frontend and backend dependencies
- ✅ Run ESLint on frontend
- ✅ Run TypeScript type checking
- ✅ Build frontend to ensure no build errors
- ✅ Run backend tests (if any)

#### 2. **Deploy Stage** (only if tests pass)
- 🚀 SSH into EC2 instance
- 📥 Pull latest code from master
- 🛑 Stop current containers
- 🧹 Clean up old Docker resources
- 🏗️ Build and start production containers
- 🔍 Health check all services
- ✅ Confirm deployment success

## 📊 Monitoring

### View Deployment Status
- Go to GitHub → Actions tab
- See real-time deployment progress
- View logs for any issues

### Check EC2 Services
```bash
# On EC2, check running containers
docker-compose -f docker-compose.prod.yml ps

# View logs
make logs

# Check service health
curl http://localhost/health        # Frontend
curl http://localhost:5000/health   # Backend
```

## 🐛 Troubleshooting

### Common Issues

**1. SSH Connection Failed**
- Verify `EC2_HOST` IP is correct
- Ensure `EC2_SSH_KEY` includes full key with headers
- Check EC2 security group allows SSH (port 22)

**2. Docker Permission Denied**
```bash
# On EC2, add user to docker group
sudo usermod -aG docker $USER
# Logout and login again
```

**3. Port Already in Use**
```bash
# Stop any conflicting services
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :5000
# Kill processes using those ports
```

**4. Deployment Script Fails**
```bash
# Run deployment manually to debug
cd ~/Dispatch_Tool_V3
./scripts/deploy.sh
```

## 🔒 Security Notes

- SSH keys are stored securely in GitHub Secrets
- Only repository collaborators can trigger deployments
- EC2 security groups should restrict access to necessary ports
- Consider using IAM roles instead of SSH keys for enhanced security

## 📈 Next Steps

After setup, your workflow will be:

1. **Develop** → Make changes locally or in feature branches
2. **Test** → Create PR to master
3. **Review** → Team reviews and approves PR
4. **Deploy** → Merge PR → Automatic deployment! 🎉

No more manual deployment steps needed!