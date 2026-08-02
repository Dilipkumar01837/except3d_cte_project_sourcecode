FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends python3 default-jdk g++ golang-go rustc ca-certificates && rm -rf /var/lib/apt/lists/* && npm install --global typescript@5.7.3

COPY docker/code-runner/execute.py /runner/execute.py
RUN chmod 0555 /runner/execute.py

ENTRYPOINT ["python3", "/runner/execute.py"]
