from node:lts as build
workdir /app
copy . .
run mkdir certs && openssl req -x509 -newkey rsa:2048 -sha256 -days 36500 -nodes -keyout certs/privkey.pem -out certs/fullchain.pem -subj '/CN=dialog'
run npm ci
from node:lts-slim
workdir /app
copy --from=build /app /app
run apt-get update && apt-get install -y jq curl dnsutils netcat
run printf 'while true; do (echo -e "HTTP/1.1 200 OK\\r\\n") | nc -lp 1111 > /dev/null; done' > /healthcheck.sh && chmod +x /healthcheck.sh
run echo ' \n\
/healthcheck.sh& \n\
echo -e $(echo -e ${perms_key//\n/n}) > /app/certs/perms.pub.pem \n\            
head -3 /app/certs/perms.pub.pem \n\            
export MEDIASOUP_ANNOUNCED_IP=$(curl ${{ env.PUB_IP_CURL }}) \n\
echo "MEDIASOUP_ANNOUNCED_IP: $MEDIASOUP_ANNOUNCED_IP" \n\
export INTERACTIVE=nope \n\
npm start' >> /init.sh
run cat /init.sh
cmd bash /init.sh
