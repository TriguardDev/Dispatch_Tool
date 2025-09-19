# Backend Dockerfile - Development
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Make wait-for-it.sh executable
RUN chmod +x wait-for-it.sh

# Expose port
EXPOSE 8000

# Start development server with wait-for-it
CMD ["./wait-for-it.sh", "mysql:3306", "--", "python", "app.py"]