#!/bin/bash
set -e

echo "=== 1. Setting up Node 22 for Capacitor ==="
source ~/.nvm/nvm.sh
nvm install 22
nvm use 22

echo "=== 2. Running Capacitor Build & Sync ==="
cd /home/pepper-salt/Documents/melora-tunes
node scripts/build-cap.js

echo "=== 3. Setting up Android SDK locally ==="
export ANDROID_HOME=$HOME/.android-sdk
mkdir -p $ANDROID_HOME/cmdline-tools
cd $ANDROID_HOME/cmdline-tools

if [ ! -d "latest" ]; then
    echo "Downloading Android Command Line Tools..."
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
    unzip -q commandlinetools-linux-11076708_latest.zip
    mv cmdline-tools latest
    rm commandlinetools-linux-11076708_latest.zip
fi

echo "Accepting licenses and installing SDK components..."
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses > /dev/null
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-36" "build-tools;34.0.0" "platforms;android-34"

echo "=== 4. Building APK ==="
cd /home/pepper-salt/Documents/melora-tunes/android
chmod +x gradlew
./gradlew assembleDebug

echo "=== DONE! ==="
ls -la app/build/outputs/apk/debug/
