#!/bin/bash

# Script de démarrage pour CRM Shipping Tool
# Pour Termux/Android

echo "======================================"
echo "  📦 CRM Shipping Tool"
echo "======================================"
echo ""

# Vérifier si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "⚙️  Installation des dépendances..."
    npm install --python=/usr/local/bin/python3
    echo ""
fi

# Démarrer le serveur
echo "🚀 Démarrage du serveur..."
echo ""
echo "📱 Accédez à l'application sur:"
echo "   → http://localhost:3000"
echo ""
echo "💡 Pour arrêter: Appuyez sur Ctrl+C"
echo ""
echo "======================================"
echo ""

node server.js
