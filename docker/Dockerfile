# Dockerfile for running the Smart Plants Home Assistant integration
# test suite on Linux. Home Assistant depends on `fcntl`, which is not
# available on Windows, so the suite cannot run natively on the host.
#
# NOTE on the Python version:
#   The pinned `homeassistant==2026.8.0` (via requirements-dev.txt and
#   pyproject.toml) declares `requires-python = ">=3.14.2"`. Any pip
#   install on 3.13 is rejected with
#     "Ignored the following versions that require a different python
#      version: 2026.8.0 Requires-Python >=3.14.2".
#   So this image runs on 3.14 even though
#   pytest-homeassistant-custom-component emits a Python 3.14 preview
#   warning. That warning is expected — it is not a test failure.
FROM python:3.14.7-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app

# Minimal system deps. Home Assistant's runtime pulls in a few C
# extensions (aiohttp, cryptography, ciso8601). The slim image already
# has enough to install pre-built wheels for these on linux/amd64 and
# linux/arm64, but keep git + build-essential around as a fallback for
# source builds.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      git \
      build-essential \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dev requirements first so this layer caches across source
# edits. requirements-dev.txt pins Home Assistant itself.
COPY requirements-dev.txt /tmp/requirements-dev.txt
RUN pip install --upgrade pip \
 && pip install -r /tmp/requirements-dev.txt

# We deliberately do NOT `pip install .`. The integration is loaded via
# PYTHONPATH=/app, the same way HA loads it out of the config directory.

# Source is mounted at runtime via docker-compose; nothing to copy here.

CMD ["pytest", "-q"]
