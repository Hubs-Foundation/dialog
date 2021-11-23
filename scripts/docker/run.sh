# TODO: need a better one
healthcheck(){
    while true; do (echo -e 'HTTP/1.1 200 OK\r\n\r\n 1') | nc -lp 1111 > /dev/null; done
}


healthcheck &

echo -e $(echo -e ${perms_key//\n/n}) > /app/certs/perms.pub.pem \n\            
head -3 /app/certs/perms.pub.pem \n\            
export MEDIASOUP_ANNOUNCED_IP=$(curl ${{ env.PUB_IP_CURL }}) \n\
echo "MEDIASOUP_ANNOUNCED_IP: $MEDIASOUP_ANNOUNCED_IP" \n\
export INTERACTIVE=nope \n\

npm start
