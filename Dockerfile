from node:lts as build
workdir /app
copy . .
run mkdir certs && openssl req -x509 -newkey rsa:2048 -sha256 -days 36500 -nodes -keyout certs/privkey.pem -out certs/fullchain.pem -subj '/CN=dialog'
run npm ci
from node:lts-slim
workdir /app
copy --from=build /app /app
run apt-get update && apt-get install -y jq curl dnsutils netcat
copy scripts/docker/run.sh /run.sh
cmd bash /run.sh
