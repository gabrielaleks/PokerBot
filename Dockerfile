ARG PNPM_VERSION=8.7.1
FROM node:20.6.1

COPY . ./pokerbot
WORKDIR /pokerbot

RUN npm install -g pnpm@${PNPM_VERSION}

RUN apt-get update && apt-get install -y python3 python3-pip python3.11-venv
WORKDIR /pokerbot/src/app/api/ai/embed/audio
RUN python3 -m venv venv
RUN venv/bin/pip install --no-cache-dir -r requirements.txt
ENV PATH="/pokerbot/src/app/api/ai/embed/audio/venv/bin:$PATH"

WORKDIR /pokerbot

ENTRYPOINT pnpm install && pnpm run dev