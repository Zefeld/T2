#!/bin/bash

# Health Check Script for vLLM Service
# This script checks if the vLLM service is running properly

set -e

# Configuration
VLLM_HOST=${VLLM_HOST:-"localhost"}
VLLM_PORT=${VLLM_PORT:-8000}
TIMEOUT=${TIMEOUT:-10}

echo "Checking vLLM service health..."
echo "Host: ${VLLM_HOST}"
echo "Port: ${VLLM_PORT}"
echo "Timeout: ${TIMEOUT}s"

# Function to check if service is responding
check_health() {
    local url="http://${VLLM_HOST}:${VLLM_PORT}/health"
    
    echo "Checking health endpoint: ${url}"
    
    if command -v curl &> /dev/null; then
        response=$(curl -s -w "%{http_code}" -o /tmp/health_response --connect-timeout ${TIMEOUT} "${url}" || echo "000")
        
        if [ "$response" = "200" ]; then
            echo "✅ Health check passed!"
            echo "Response:"
            cat /tmp/health_response
            rm -f /tmp/health_response
            return 0
        else
            echo "❌ Health check failed!"
            echo "HTTP Status Code: $response"
            if [ -f /tmp/health_response ]; then
                echo "Response:"
                cat /tmp/health_response
                rm -f /tmp/health_response
            fi
            return 1
        fi
    else
        echo "curl not found, trying with wget..."
        if command -v wget &> /dev/null; then
            if wget -q --timeout=${TIMEOUT} -O /tmp/health_response "${url}"; then
                echo "✅ Health check passed!"
                echo "Response:"
                cat /tmp/health_response
                rm -f /tmp/health_response
                return 0
            else
                echo "❌ Health check failed!"
                rm -f /tmp/health_response
                return 1
            fi
        else
            echo "Neither curl nor wget found. Cannot perform health check."
            return 1
        fi
    fi
}

# Function to check models endpoint
check_models() {
    local url="http://${VLLM_HOST}:${VLLM_PORT}/v1/models"
    
    echo "Checking models endpoint: ${url}"
    
    if command -v curl &> /dev/null; then
        response=$(curl -s -w "%{http_code}" -o /tmp/models_response --connect-timeout ${TIMEOUT} "${url}" || echo "000")
        
        if [ "$response" = "200" ]; then
            echo "✅ Models endpoint accessible!"
            echo "Available models:"
            cat /tmp/models_response | python3 -m json.tool 2>/dev/null || cat /tmp/models_response
            rm -f /tmp/models_response
            return 0
        else
            echo "⚠️  Models endpoint not accessible (HTTP $response)"
            rm -f /tmp/models_response
            return 1
        fi
    fi
}

# Function to check GPU status
check_gpu() {
    echo "Checking GPU status..."
    
    if command -v nvidia-smi &> /dev/null; then
        echo "GPU Information:"
        nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu --format=csv,noheader,nounits
        return 0
    else
        echo "⚠️  nvidia-smi not found. GPU status unknown."
        return 1
    fi
}

# Main health check
main() {
    echo "=== vLLM Service Health Check ==="
    echo "Timestamp: $(date)"
    echo ""
    
    # Check basic health
    if check_health; then
        echo ""
        
        # Check models if health is OK
        check_models
        echo ""
        
        # Check GPU status
        check_gpu
        echo ""
        
        echo "=== Health Check Summary ==="
        echo "✅ Service is healthy and operational"
        exit 0
    else
        echo ""
        echo "=== Health Check Summary ==="
        echo "❌ Service is not healthy"
        exit 1
    fi
}

# Run main function
main "$@"