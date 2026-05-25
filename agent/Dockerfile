# ============================================================
# Locai Agent — Python 3.12 + FastAPI + LangGraph
# ============================================================
FROM python:3.12-slim AS builder

RUN pip install --no-cache-dir uv

WORKDIR /app

# Copy dependency manifest first for layer caching
COPY pyproject.toml .

# Install all project dependencies from pyproject.toml into /app/.venv
RUN uv venv .venv && \
    uv pip install \
        --python /app/.venv/bin/python \
        --no-cache \
        .

# ============================================================
FROM python:3.12-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd --system agent && useradd --system --gid agent agent

WORKDIR /app

# Copy virtualenv from builder
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Copy source
COPY --chown=agent:agent . .

USER agent

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:8080/health || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8080", \
     "--proxy-headers", \
     "--forwarded-allow-ips=*", \
     "--workers", "2"]
