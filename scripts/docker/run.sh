# TODO: need a better one
PUB_IP_CURL=https://ipinfo.io/ip

echo -e $(echo -e ${perms_key//\n/n}) > /app/certs/perms.pub.pem
head -3 /app/certs/perms.pub.pem
export MEDIASOUP_ANNOUNCED_IP=$(curl ${PUB_IP_CURL})
echo "MEDIASOUP_ANNOUNCED_IP: $MEDIASOUP_ANNOUNCED_IP"
export INTERACTIVE=nope

# npm start
DEBUG='*INFO* *WARN* *ERROR*' node index.js
