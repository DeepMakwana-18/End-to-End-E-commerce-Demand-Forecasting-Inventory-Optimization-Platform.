FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn

# Copy application code
COPY backend/ .

# Expose port
EXPOSE 8000

ENV WORKER_COUNT=4

CMD gunicorn app.main:app --workers ${WORKER_COUNT} --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

