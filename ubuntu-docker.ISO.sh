#!/bin/bash
### Version 3.1 ###
### June 2023 ###

#Check restricted-softwares !!
name=$1
if [ "$name" == "" ]; then
        echo "Filename is missing!!!"
        echo "Example: ./ubuntu.ISO.HN.sh ha.tien.cong.minh FHN-01-101-xxxx"
        exit 1
fi

devicecode=$2
if [ "$devicecode" == "" ]; then
        echo "Device code is missing!!!"
        echo "Example: ./ubuntu.ISO.HN.sh ha.tien.cong.minh FHN-01-101-xxxx"
        exit 1
fi

date=$(date +%Y%m%d)

echo "======Running Time======"  >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt
date >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt
echo "" >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt

echo "======Check OS======"  >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt
uname -a >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt
echo "" >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt

echo "======Check Domain======"  >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt
domain=$(hostname -d)

if [ $domain == sun-asterisk.com ];then
        echo "DOMAIN JOINED" >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt
else
        echo "NON DOMAIN JOINED" >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt
fi

echo "======Check Computer name======" >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt
hostname -f >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt

echo "======Check IP======" >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt
ip add show | grep "inet" | grep -v "127.0.0.1" | grep -v "inet6" | awk {'print $2'} >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt
echo "" >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt

echo "======Check Network Card & MAC Address======" >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt
sudo apt install net-tools -y && sudo apt-get install wireless-tools -y
ifconfig | awk '/^[a-zA-Z]/ {ifname=$1} /inet / && ifname !~ /^vir/ {print ifname,$2} /ether / && ifname !~ /^vir/ {print ifname,$2}' >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt

echo "======Check Antivirus======"  >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt
virus=$(ps aux | grep savd | wc -l)
virus=$(ps aux | grep clamav | wc -l)

if [ $virus -gt 1 ]; then
        echo "Antivirus is already installed" >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt
else
        echo "Antivirus hasn't been installed" >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt
fi

echo "======Check Installed Softwares======"  >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt
dpkg --get-selections | awk {'print $1'} | grep -v liborbit\|transmission >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt
echo "" >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt

echo " " >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt
echo "======================================================== THE END ==================================================================" >> /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt

#Upload result to ftp server
pass=$(openssl enc -base64 -d <<< ZnJhbWdpYWluZnJh)
curl --silent --max-time 5 -T /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt ftp://10.0.5.250//var/ftp/iso/Linux/ --user infra:$pass

#check status scrip
status=$(echo $?)
echo $status
if [ $status == 0 ]; then
        echo "====== Tải lên thành công / Upload Successfully ======="
        rm -rf /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt
else
        echo "====== Ðã xảy ra lỗi trong quá trình tải lên, vui lòng tải tập tin kết qủa lên thu mục của ISO / Oops, An error occurred during the upload, please upload file result manually to the ISO's directory ======"
	cp /tmp/$date.iso.$name@sun-asterisk.com.$devicecode.txt /home/*/Desktop/
fi
date

### EOF ###
