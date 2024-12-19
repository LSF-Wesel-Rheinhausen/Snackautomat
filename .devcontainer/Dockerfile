# Base image for Python
FROM mcr.microsoft.com/devcontainers/python:3.11

# Install additional dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && apt-get clean

# Set working directory
WORKDIR /workspace

# Install Python dependencies
COPY requirements.txt /workspace/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt