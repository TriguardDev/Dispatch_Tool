FROM python:latest

# Set the working directory
WORKDIR /app

# Copy the current directory contents into the container
COPY requirements.txt .
COPY wait-for-it.sh .

RUN pip install --no-cache-dir -r requirements.txt

# Expose port 5000 for the Flask app
EXPOSE 6000

# Run the Flask app
CMD ["./wait-for-it.sh", "mysql:3306", "--", "flask", "--debug", "run", "--host=0.0.0.0", "--port=6000"]