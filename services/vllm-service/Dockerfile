# vLLM Service Dockerfile
# Optimized for SciBox deployment with GPU support

FROM nvidia/cuda:12.1-devel-ubuntu22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV CUDA_HOME=/usr/local/cuda
ENV PATH=${CUDA_HOME}/bin:${PATH}
ENV LD_LIBRARY_PATH=${CUDA_HOME}/lib64:${LD_LIBRARY_PATH}

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    git \
    wget \
    curl \
    build-essential \
    cmake \
    ninja-build \
    libssl-dev \
    zlib1g-dev \
    libbz2-dev \
    libreadline-dev \
    libsqlite3-dev \
    libncursesw5-dev \
    xz-utils \
    tk-dev \
    libxml2-dev \
    libxmlsec1-dev \
    libffi-dev \
    liblzma-dev \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /app

# Install Python dependencies
RUN pip3 install --no-cache-dir --upgrade pip setuptools wheel

# Install PyTorch with CUDA support
RUN pip3 install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install vLLM with CUDA support
RUN pip3 install --no-cache-dir vllm[cuda]

# Install additional dependencies for SciBox compatibility
RUN pip3 install --no-cache-dir \
    fastapi \
    uvicorn[standard] \
    pydantic \
    transformers \
    accelerate \
    bitsandbytes \
    scipy \
    numpy \
    requests \
    aiofiles \
    python-multipart \
    prometheus-client \
    psutil

# Create directories for models and config
RUN mkdir -p /app/models /app/config /app/logs

# Copy configuration files
COPY config/ /app/config/
COPY scripts/ /app/scripts/

# Set permissions for scripts
RUN chmod +x /app/scripts/*.sh

# Create non-root user for security
RUN useradd -m -u 1000 vllm && \
    chown -R vllm:vllm /app
USER vllm

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default command
CMD ["/app/scripts/start.sh"]