FROM node:20-bookworm-slim

# Set working directory
WORKDIR /app

# Install Python and dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment for Python
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy package files
COPY package.json package-lock.json ./

# Install Node modules
RUN npm install --legacy-peer-deps

# Copy Python requirements
COPY requirements.txt ./

# Install Python modules
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files (except those in .dockerignore)
COPY . .

# Build Next.js application
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
