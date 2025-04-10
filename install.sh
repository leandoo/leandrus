#!/bin/bash

# Cores para o terminal
RED='\033[1;31m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
CYAN='\033[1;36m'
NC='\033[0m'

# URL do arquivo principal
LEANDRUS_JS_URL="https://raw.githubusercontent.com/leandoo/leandrus/refs/heads/main/leandrus.js"

# Função para instalar dependências
install_dependencies() {
    echo -e "${YELLOW}[*] Instalando dependências...${NC}"
    
    # Atualizar pacotes básicos
    pkg update -y && \
    pkg upgrade -y
    
    # Instalar dependências essenciais
    pkg install -y nodejs git curl wget python
    
    # Instalar dependências do Node.js globalmente
    npm install -g \
        express \
        chalk \
        figlet \
        boxen \
        @google/generative-ai \
        ora \
        gradient-string \
        child_process \
        util \
        fs \
        path \
        crypto \
        http \
        readline
    
    # Dependências opcionais (para melhor experiência)
    npm install -g \
        nodemon \
        pm2
    
    echo -e "${GREEN}[+] Dependências instaladas com sucesso!${NC}"
}

# Função principal
main() {
    clear
    
    # Arte ASCII completa
    echo -e "${CYAN}"
    echo "⠄⠄⠄⣾⣿⠿⠿⠶⠿⢿⣿⣿⣿⣿⣦⣤⣄⢀⡅⢠⣾⣛⡉⠄⠄⠄⠸⢀⣿"
    echo "⠄⠄⢀⡋⣡⣴⣶⣶⡀⠄⠄⠙⢿⣿⣿⣿⣿⣿⣴⣿⣿⣿⢃⣤⣄⣀⣥⣿⣿"
    echo "⠄⠄⢸⣇⠻⣿⣿⣿⣧⣀⢀⣠⡌⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠿⠿⣿⣿⣿"
    echo "⠄⢀⢸⣿⣷⣤⣤⣤⣬⣙⣛⢿⣿⣿⣿⣿⣿⣿⡿⣿⣿⡍⠄⠄⢀⣤⣄⠉⠋"
    echo "⠄⣼⣖⣿⣿⣿⣿⣿⣿⣿⣿⣿⢿⣿⣿⣿⣿⣿⢇⣿⣿⡷⠶⠶⢿⣿⣿⠇⢀"
    echo "⠘⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣽⣿⣿⣿⡇⣿⣿⣿⣿⣿⣿⣷⣶⣥⣴⣿"
    echo "⢀⠈⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟"
    echo "⢸⣿⣦⣌⣛⣻⣿⣿⣧⠙⠛⠛⡭⠅⠒⠦⠭⣭⡻⣿⣿⣿⣿⣿⣿⣿⣿⡿⠃"
    echo "⠘⣿⣿⣿⣿⣿⣿⣿⣿⡆⠄⠄⠄⠄⠄⠄⠄⠄⠹⠈⢋⣽⣿⣿⣿⣿⣵⣾⠃"
    echo "⠄⠘⣿⣿⣿⣿⣿⣿⣿⣿⠄⣴⣿⣶⣄⠄⣴⣶⠄⢀⣾⣿⣿⣿⣿⣿⣿⠃⠄"
    echo "⠄⠄⠈⠻⣿⣿⣿⣿⣿⣿⡄⢻⣿⣿⣿⠄⣿⣿⡀⣾⣿⣿⣿⣿⣛⠛⠁⠄⠄"
    echo -e "${NC}"
   
    # Cria diretório
    mkdir -p ~/leandrus-pro
    cd ~/leandrus-pro || exit
    
    # Baixa o arquivo principal
    echo -e "${BLUE}[*] Baixando Leandrus PRO...${NC}"
    if ! curl -fsSL "$LEANDRUS_JS_URL" -o leandrus.js; then
        echo -e "${RED}[ERRO] Falha ao baixar o arquivo principal${NC}"
        exit 1
    fi
    
    # Instala dependências
    install_dependencies
    
    # Cria atalhos
    echo -e "${YELLOW}[*] Criando atalhos...${NC}"
    echo -e "alias leo='node ~/leandrus-pro/leandrus.js'" >> ~/.bashrc
    echo -e "alias leo-update='cd ~/leandrus-pro && curl -fsSL $LEANDRUS_JS_URL -o leandrus.js'" >> ~/.bashrc
    echo -e "alias leo-dev='cd ~/leandrus-pro && nodemon leandrus.js'" >> ~/.bashrc
    
    echo -e "${GREEN}"
    echo " ██████╗ ██████╗ ███████╗███╗   ██╗"
    echo "██╔═══██╗██╔══██╗██╔════╝████╗  ██║"
    echo "██║   ██║██████╔╝█████╗  ██╔██╗ ██║"
    echo "██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║"
    echo "╚██████╔╝██║     ███████╗██║ ╚████║"
    echo " ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝"
    echo -e "${NC}"
    
    echo -e "${GREEN}[+] Instalação concluída com sucesso!${NC}"
    echo -e "${YELLOW}[!] Use 'leo' para iniciar normalmente${NC}"
    echo -e "${YELLOW}[!] Use 'leo-dev' para modo desenvolvedor${NC}"
    echo -e "${YELLOW}[!] Use 'leo-update' para atualizar${NC}"
    echo -e "${YELLOW}[!] Reinicie o terminal ou execute: source ~/.bashrc${NC}"
}

# Executa a função principal
main
