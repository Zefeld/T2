#!/bin/bash

# vLLM Service Startup Script
# This script starts the vLLM service with proper configuration

set -e

echo "Starting vLLM Service..."

# Load environment variables if .env file exists
if [ -f /app/config/.env ]; then
    echo "Loading environment variables from .env file..."
    export $(cat /app/config/.env | grep -v '^#' | xargs)
fi

# Set default values if not provided
export MODEL_NAME=${MODEL_NAME:-"microsoft/DialoGPT-medium"}
export VLLM_HOST=${VLLM_HOST:-"0.0.0.0"}
export VLLM_PORT=${VLLM_PORT:-8000}
export MAX_MODEL_LEN=${MAX_MODEL_LEN:-2048}
export GPU_MEMORY_UTILIZATION=${GPU_MEMORY_UTILIZATION:-0.9}
export TENSOR_PARALLEL_SIZE=${TENSOR_PARALLEL_SIZE:-1}
export PIPELINE_PARALLEL_SIZE=${PIPELINE_PARALLEL_SIZE:-1}
export BLOCK_SIZE=${BLOCK_SIZE:-16}
export SWAP_SPACE=${SWAP_SPACE:-4}
export MAX_NUM_BATCHED_TOKENS=${MAX_NUM_BATCHED_TOKENS:-2048}
export MAX_NUM_SEQS=${MAX_NUM_SEQS:-256}

# Create logs directory if it doesn't exist
mkdir -p /app/logs

# Check if GPU is available
if command -v nvidia-smi &> /dev/null; then
    echo "GPU detected:"
    nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader,nounits
else
    echo "Warning: No GPU detected. vLLM will run on CPU (not recommended for production)"
fi

# Check if model exists locally, if not, it will be downloaded automatically
if [ ! -d "/app/models/${MODEL_NAME}" ]; then
    echo "Model ${MODEL_NAME} not found locally. It will be downloaded on first run."
fi

# Start vLLM server
echo "Starting vLLM server with model: ${MODEL_NAME}"
echo "Server will be available at: http://${VLLM_HOST}:${VLLM_PORT}"

exec python -m vllm.entrypoints.openai.api_server \
    --model "${MODEL_NAME}" \
    --host "${VLLM_HOST}" \
    --port "${VLLM_PORT}" \
    --max-model-len "${MAX_MODEL_LEN}" \
    --gpu-memory-utilization "${GPU_MEMORY_UTILIZATION}" \
    --tensor-parallel-size "${TENSOR_PARALLEL_SIZE}" \
    --pipeline-parallel-size "${PIPELINE_PARALLEL_SIZE}" \
    --block-size "${BLOCK_SIZE}" \
    --swap-space "${SWAP_SPACE}" \
    --max-num-batched-tokens "${MAX_NUM_BATCHED_TOKENS}" \
    --max-num-seqs "${MAX_NUM_SEQS}" \
    --disable-log-stats \
    --served-model-name "${MODEL_NAME}" \
    --trust-remote-code