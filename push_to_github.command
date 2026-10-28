#!/bin/bash
cd "$(dirname "$0")"
echo "=================================================================="
echo "          Blink-Assist -> GitHub Authentication & Push"
echo "=================================================================="
echo ""
echo "[*] Authenticating with GitHub..."
gh auth login -p https -w

echo ""
echo "[*] Pushing branch 'main' to https://github.com/Shan-7/blinkassist..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "=================================================================="
    echo "[OK] Successfully pushed to GitHub!"
    echo "=================================================================="
    echo "Opening GitHub Actions in your browser..."
    open "https://github.com/Shan-7/blinkassist/actions"
else
    echo ""
    echo "[!] Push failed. Please check the error above."
fi

echo ""
read -p "Press Enter to exit..."
