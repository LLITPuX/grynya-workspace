# Dockerfile
FROM node:22-bookworm-slim

# Встановлення системних залежностей
RUN apt-get update && apt-get install -y \
    git \
    curl \
    build-essential \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Налаштування робочої директорії
WORKDIR /app

# Очікуємо, що воркспейс буде змонтований у /app
# Використовуємо bash як основну оболонку
CMD ["bash"]
