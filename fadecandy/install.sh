#!/bin/bash

if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

source ./install_src

echo -e $c_green"Creating install directory : "$s_dim"$DAEMON_PATH"$c_def $s_def

mkdir -p $DAEMON_PATH

echo -e $c_green"Installing files : "$s_dim"$(pwd) -> $SERVICE_PATH"$c_def $s_def
cp -R ./* $DAEMON_PATH

echo -e $c_green"Installing service in  : "$s_dim"$SERVICE_PATH"$c_def $s_def

cat > $SERVICE_PATH.service <<- EOM
[Unit]
Description=LED Lamp - FadeCandy Server

[Service]
Type=simple
User=root
ExecStart=/srv/lamp-fc-server/fcserver-rpi /srv/lamp-fc-server/config.json

[Install]
WantedBy=multi-user.target
EOM

systemctl daemon-reload

echo -e $c_green"Starting service in  : "$s_dim"$SERVICE_PATH"$c_def $s_def
systemctl start $DAEMON_NAME
systemctl enable $DAEMON_NAME
