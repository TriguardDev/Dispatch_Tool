FROM python:latest

# Set the working directory
WORKDIR /app

# Copy the current directory contents into the container
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Expose port for the Flask app
EXPOSE 5002

# Run the Flask app
CMD ["flask", "--debug", "run", "--host=0.0.0.0", "--port=5002"]