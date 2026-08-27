#!/bin/bash

# Install the FadeCandy server (fcserver) as a hardened, non-root systemd service.
# Run as root on the Pi (or via scripts/pi/): bash fadecandy/install.sh
# Idempotent: safe to re-run after a card re-flash to restore the FadeCandy stack.

if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

source ./install_src

set -e

DAEMON_PATH="${DAEMON_PATH%/}"

echo -e $c_green"Creating system user : "$s_dim"lamp"$c_def $s_def
id -u lamp >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin lamp

echo -e $c_green"Creating install directory : "$s_dim"$DAEMON_PATH"$c_def $s_def
mkdir -p $DAEMON_PATH

echo -e $c_green"Installing files : "$s_dim"$(pwd) -> $DAEMON_PATH"$c_def $s_def
install -m 755 -o lamp -g lamp fcserver-rpi $DAEMON_PATH
install -m 644 -o lamp -g lamp config.json $DAEMON_PATH

echo -e $c_green"Granting USB access (udev + dialout)..."$c_def $s_def
cat > /etc/udev/rules.d/99-fadecandy.rules <<- EOM
SUBSYSTEM=="usb", ATTRS{idVendor}=="1d50", ATTRS{idProduct}=="607a", GROUP="dialout", MODE="0660"
EOM
usermod -aG dialout lamp
udevadm control --reload-rules
udevadm trigger

echo -e $c_green"Installing service : "$s_dim"$SERVICE_PATH.service"$c_def $s_def
cat > $SERVICE_PATH.service <<- EOM
[Unit]
Description=LED Lamp - FadeCandy Server
After=local-fs.target

[Service]
Type=simple
User=lamp
Group=lamp
ExecStart=$DAEMON_PATH/fcserver-rpi $DAEMON_PATH/config.json
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictAddressFamilies=AF_UNIX AF_INET AF_NETLINK
DevicePolicy=closed
DeviceAllow=char-usb_device rw
DeviceAllow=/dev/ttyACM* rw

[Install]
WantedBy=multi-user.target
EOM

systemctl daemon-reload
systemctl enable $DAEMON_NAME
systemctl restart $DAEMON_NAME

echo -e $c_green"Verifying..."$c_def $s_def
sleep 2
systemctl --no-pager --lines=6 status $DAEMON_NAME | tail -7