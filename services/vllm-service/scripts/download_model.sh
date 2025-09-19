#!/bin/bash

# Model Download Script for vLLM
# This script downloads and prepares models for vLLM service

set -e

# Default model if not specified
MODEL_NAME=${1:-"microsoft/DialoGPT-medium"}
MODEL_DIR="/app/models"

echo "Downloading model: ${MODEL_NAME}"
echo "Target directory: ${MODEL_DIR}"

# Create models directory if it doesn't exist
mkdir -p "${MODEL_DIR}"

# Function to download model using Python
download_model() {
    local model_name=$1
    local target_dir=$2
    
    python3 -c "
import os
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

model_name = '${model_name}'
target_dir = '${target_dir}'

print(f'Downloading tokenizer for {model_name}...')
tokenizer = AutoTokenizer.from_pretrained(
    model_name,
    cache_dir=target_dir,
    trust_remote_code=True
)

print(f'Downloading model {model_name}...')
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    cache_dir=target_dir,
    trust_remote_code=True,
    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
    device_map='auto' if torch.cuda.is_available() else 'cpu'
)

print(f'Model {model_name} downloaded successfully!')
print(f'Model files are cached in: {target_dir}')
"
}

# Check if Python and required packages are available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python3 is not installed"
    exit 1
fi

# Check if transformers is installed
python3 -c "import transformers" 2>/dev/null || {
    echo "Installing transformers..."
    pip3 install transformers torch
}

# Download the model
echo "Starting model download..."
download_model "${MODEL_NAME}" "${MODEL_DIR}"

echo "Model download completed!"
echo "You can now start the vLLM service with this model."

# List downloaded models
echo ""
echo "Available models in ${MODEL_DIR}:"
ls -la "${MODEL_DIR}" || echo "No models found in directory"