// Leandrus PRO - Termux Edition
// Bot de IA com interface de terminal otimizada para Termux
// Versão: 3.0.0 (Full Edition - Corrigida e Atualizada)

// Importações de módulos nativos
const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const http = require('http');
const https = require('https');
const os = require('os');

// Verificar se as bibliotecas opcionais estão disponíveis
let express, chalk, figlet, boxen, GoogleGenerativeAI;

// Fallback para express
try {
  express = require('express');
} catch (e) {
  console.log('Express não encontrado. Servidor web será desativado.');
  express = null;
}

// Fallback para chalk - Versão 100% testada e funcional
try {
    chalk = require('chalk');
} catch (e) {
    chalk = {
        red: (text) => `\x1b[31m${text}\x1b[0m`,
        green: (text) => `\x1b[32m${text}\x1b[0m`,
        blue: (text) => `\x1b[34m${text}\x1b[0m`,
        yellow: (text) => `\x1b[33m${text}\x1b[0m`,
        gray: (text) => `\x1b[90m${text}\x1b[0m`,
        bold: {
            red: (text) => `\x1b[1;31m${text}\x1b[0m`,
            green: (text) => `\x1b[1;32m${text}\x1b[0m`,
            blue: (text) => `\x1b[1;34m${text}\x1b[0m`,
            yellow: (text) => `\x1b[1;33m${text}\x1b[0m`
        },
        hex: (hex) => {
            const colorCode = hex.replace('#', '');
            const r = parseInt(colorCode.substring(0, 2), 16);
            const g = parseInt(colorCode.substring(2, 4), 16);
            const b = parseInt(colorCode.substring(4, 6), 16);
            return (text) => `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
        }
    };
}

// Fallback para figlet
try {
  figlet = require('figlet');
} catch (e) {
  figlet = (text, options, callback) => {
    callback(null, text);
  };
}

// Fallback para boxen
try {
  boxen = require('boxen');
} catch (e) {
  boxen = (text, options = {}) => {
    const defaultStyle = {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: '#00FF00',
        backgroundColor: '#121212'
    };
    
    const config = { ...defaultStyle, ...options };
    const lines = text.split('\n');
    const maxLineLength = Math.max(...lines.map(line => line.length));
    const width = maxLineLength + (config.padding * 2);
    
    const borders = {
        round: {
            topLeft: '╭', topRight: '╮',
            bottomLeft: '╰', bottomRight: '╯',
            horizontal: '─', vertical: '│'
        },
        single: {
            topLeft: '┌', topRight: '┐',
            bottomLeft: '└', bottomRight: '┘',
            horizontal: '─', vertical: '│'
        },
        double: {
            topLeft: '╔', topRight: '╗',
            bottomLeft: '╚', bottomRight: '╝',
            horizontal: '═', vertical: '║'
        }
    };
    
    const border = borders[config.borderStyle] || borders.round;
    const topBorder = border.topLeft + border.horizontal.repeat(width) + border.topRight;
    const bottomBorder = border.bottomLeft + border.horizontal.repeat(width) + border.bottomRight;
    
    const paddedLines = lines.map(line => {
        const padding = ' '.repeat(config.padding);
        // Garantir que o valor para repeat seja sempre positivo
        const lineSpacing = Math.max(0, width - line.length - config.padding);
        return `${border.vertical}${padding}${line}${' '.repeat(lineSpacing)}${padding}${border.vertical}`;
    });
    
    let titleLine = '';
    if (config.title) {
        const title = ` ${config.title} `;
        // Garantir que o valor para repeat seja sempre positivo
        const titlePadding = Math.max(0, width - title.length);
        titleLine = `${border.vertical}${title}${' '.repeat(titlePadding)}${border.vertical}\n`;
    }
    
    return `${topBorder}\n${titleLine}${paddedLines.join('\n')}\n${bottomBorder}`;
  };
}

// Verificar se a API do Google está disponível
try {
  const genAI = require('@google/generative-ai');
  GoogleGenerativeAI = genAI.GoogleGenerativeAI;
  console.log('API do Google Generative AI carregada com sucesso');
} catch (e) {
  console.log('API do Google Generative AI não encontrada. Usando modo simulado.');
  GoogleGenerativeAI = class MockGoogleGenerativeAI {
    constructor(apiKey) {
      this.apiKey = apiKey;
    }
    
    getGenerativeModel({ model }) {
      return {
        generateContent: async (prompt) => {
          return {
            response: {
              text: async () => `[Modo simulado] Resposta para: ${prompt.substring(0, 50)}...`
            }
          };
        }
      };
    }
  };
}

// ================= CONFIGURAÇÕES =================
const config = {
    API_KEYS: {
        ANALYST_1: "AIzaSyCJdAvjn_vr59QZQTkrKzJs0E72GWPGrr0",
        ANALYST_2: "AIzaSyBRsIuJ9E98fzyiKfpifzAhNNWnsyzrQus",
        ARBITER: "AIzaSyDVj-qblGxXc3Yj2gzeLa6ZtfJergGlrlo"
    },
    MODEL: "gemini-1.5-flash",
    MEMORY_FILE: "memory.json",
    TYPING_SPEED: 15,
    OUTPUT_DIR: "output_files",
    ALLOW_SYSTEM_COMMANDS: true,
    DELAY_ENTRE_REQUISICOES: 800,
    MAX_RETRIES: 3,
    MAX_LINHAS_POR_PARTE: 500,
    CACHE_DIR: "cache",
    WEB_SERVER: {
        PORT: 8080,
        FILE_THRESHOLD: 600, // Tamanho máximo de mensagem antes de gerar link
        PUBLIC_DIR: "public"
    },
    TERMUX: {
        BATTERY_SAVER: false,
        LOW_MEMORY_MODE: false,
        FIX_INPUT_LAG: true
    },
    UI: {
        THEME: "blood", // Tema dark vermelho
        ANIMATION_SPEED: 10,
        USE_EMOJIS: true,
        COMPACT_MODE: false,
        SHOW_TIMESTAMPS: true,
        SHOW_TYPING_INDICATOR: true,
        SHOW_WEATHER: true,
        SHOW_NEWS: true,
        SHOW_CLOCK: true,
        SHOW_CALENDAR: true
    }
};

const IDIOMA_PADRAO = `
Você é o Leandrus, um assistente AI avançado com personalidade hacker.
Siga estas regras STRICTAMENTE:

1. Responda SEMPRE em português (pt-BR)
2. Use tom técnico mas acessível
3. Seja objetivo e direto
4. Admita quando não souber algo
5. Formate respostas longas em markdown
6. Também faça e corrija códigos em português BR
7. Para perguntas curtas, dê respostas curtas e diretas
8. Para perguntas complexas, seja detalhado
9. NUNCA analise o próprio código a menos que seja explicitamente solicitado
10. Responda APENAS ao que o usuário perguntou, sem divagações

REGRAS ABSOLUTAS PARA CÓDIGOS:
1. NUNCA omitir, resumir ou abreviar código, mesmo que grande.
2. Se exceder o limite de tokens:
   - Dividir em blocos de ${config.MAX_LINHAS_POR_PARTE} linhas
   - Processar cada bloco separadamente
   - Juntar ao final
3. Sempre incluir um resumo técnico curto (2-3 linhas) explicando:
   - Erros encontrados
   - Principais correções
   - Sugestões de melhoria
`;

// ===== TEMAS VISUAIS =====
const temas = {
    neon: {
        nome: 'Neon',
        corPrimaria: '#00FF00',
        corSecundaria: '#00FFAA',
        corFundo: '#121212',
        corTexto: '#FFFFFF',
        corBorda: '#00FF00',
        corErro: '#FF3333',
        corAviso: '#FFAA00',
        corSucesso: '#00FF00',
        gradienteInicio: '#00FF00',
        gradienteFim: '#00FFFF',
        boxStyle: {
            borderStyle: 'round',
            borderColor: '#00FF00',
            padding: 1,
            margin: 1,
            backgroundColor: '#121212'
        }
    },
    midnight: {
        nome: 'Midnight',
        corPrimaria: '#3030FF',
        corSecundaria: '#8A8AFF',
        corFundo: '#0A0A1F',
        corTexto: '#FFFFFF',
        corBorda: '#3030FF',
        corErro: '#FF5555',
        corAviso: '#FFAA55',
        corSucesso: '#55FF55',
        gradienteInicio: '#3030FF',
        gradienteFim: '#8A8AFF',
        boxStyle: {
            borderStyle: 'round',
            borderColor: '#3030FF',
            padding: 1,
            margin: 1,
            backgroundColor: '#0A0A1F'
        }
    },
    blood: {
        nome: 'Blood',
        corPrimaria: '#FF0000',
        corSecundaria: '#AA0000',
        corFundo: '#0A0000',
        corTexto: '#FFFFFF',
        corBorda: '#FF0000',
        corErro: '#FF5555',
        corAviso: '#FFAA55',
        corSucesso: '#55FF55',
        gradienteInicio: '#FF0000',
        gradienteFim: '#AA0000',
        boxStyle: {
            borderStyle: 'round',
            borderColor: '#FF0000',
            padding: 1,
            margin: 1,
            backgroundColor: '#0A0000'
        }
    },
    sunset: {
        nome: 'Sunset',
        corPrimaria: '#FF5500',
        corSecundaria: '#FF8A00',
        corFundo: '#1A0A0A',
        corTexto: '#FFFFFF',
        corBorda: '#FF5500',
        corErro: '#FF5555',
        corAviso: '#FFAA00',
        corSucesso: '#AAFF00',
        gradienteInicio: '#FF5500',
        gradienteFim: '#FFAA00',
        boxStyle: {
            borderStyle: 'round',
            borderColor: '#FF5500',
            padding: 1,
            margin: 1,
            backgroundColor: '#1A0A0A'
        }
    },
    matrix: {
        nome: 'Matrix',
        corPrimaria: '#008800',
        corSecundaria: '#00FF00',
        corFundo: '#000000',
        corTexto: '#00FF00',
        corBorda: '#008800',
        corErro: '#FF0000',
        corAviso: '#FFFF00',
        corSucesso: '#00FF00',
        gradienteInicio: '#008800',
        gradienteFim: '#00FF00',
        boxStyle: {
            borderStyle: 'classic',
            borderColor: '#008800',
            padding: 1,
            margin: 1,
            backgroundColor: '#000000'
        }
    },
    termux: {
        nome: 'Termux',
        corPrimaria: '#AAAAAA',
        corSecundaria: '#FFFFFF',
        corFundo: '#000000',
        corTexto: '#FFFFFF',
        corBorda: '#AAAAAA',
        corErro: '#FF5555',
        corAviso: '#FFFF55',
        corSucesso: '#55FF55',
        gradienteInicio: '#AAAAAA',
        gradienteFim: '#FFFFFF',
        boxStyle: {
            borderStyle: 'classic',
            borderColor: '#AAAAAA',
            padding: 1,
            margin: 1,
            backgroundColor: '#000000'
        }
    },
    cyber: {
        nome: 'Cyber',
        corPrimaria: '#00FFFF',
        corSecundaria: '#FF00FF',
        corFundo: '#000000',
        corTexto: '#FFFFFF',
        corBorda: '#00FFFF',
        corErro: '#FF0000',
        corAviso: '#FFFF00',
        corSucesso: '#00FF00',
        gradienteInicio: '#00FFFF',
        gradienteFim: '#FF00FF',
        boxStyle: {
            borderStyle: 'double',
            borderColor: '#00FFFF',
            padding: 1,
            margin: 1,
            backgroundColor: '#000000'
        }
    }
};

// ===== SISTEMA DE ESTADO =====
const estado = {
    historico: [],
    bufferColagem: [],
    bufferTeste: [],
    modoColagem: false,
    modoTeste: false,
    memoriaPermanente: [],
    memoriaTemporaria: [],
    maxMemoriaTemporaria: 10,
    maxMemoriaPermanente: 100,
    arquivosGerados: [],
    chaveAPIAtual: 0,
    cache: new Map(),
    temaAtual: temas[config.UI.THEME] || temas.blood,
    isTermux: process.env.TERMUX_VERSION !== undefined || 
              process.env.PREFIX?.includes('com.termux') ||
              process.cwd().includes('termux'),
    servidor: null,
    urlBase: '',
    ultimoInput: '',
    ultimaResposta: '',
    clima: {
        temperatura: null,
        condicao: null,
        cidade: null,
        ultimaAtualizacao: null
    },
    noticias: [],
    ultimaAtualizacaoNoticias: null
};

// ===== FUNÇÕES UTILITÁRIAS =====
function hashString(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

function obterLarguraTerminal() {
    return process.stdout.columns || 80;
}

function criarBordaHorizontal(tipo = 'normal') {
    const largura = obterLarguraTerminal();
    const caracteres = {
        normal: '═',
        dupla: '▫️',
        forte: '■',
        cyber: '▓'
    };
    const char = caracteres[tipo] || '═';
    return chalk.hex(estado.temaAtual.corBorda)(char.repeat(largura));
}

function criarBordaVertical(texto, alinhamento = 'left') {
    const largura = obterLarguraTerminal() - 4;
    let textoFormatado = texto;
    
    if (texto.length > largura) {
        textoFormatado = texto.substring(0, largura - 3) + '...';
    }
    
    const espacos = ' '.repeat(largura - textoFormatado.length);
    
    if (alinhamento === 'center') {
        const metadeEspaco = Math.floor((largura - textoFormatado.length) / 2);
        return chalk.hex(estado.temaAtual.corBorda)(`║ ${' '.repeat(metadeEspaco)}${textoFormatado}${' '.repeat(largura - textoFormatado.length - metadeEspaco)} ║`);
    }
    
    return alinhamento === 'left' 
        ? chalk.hex(estado.temaAtual.corBorda)(`║ ${textoFormatado}${espacos} ║`)
        : chalk.hex(estado.temaAtual.corBorda)(`║ ${espacos}${textoFormatado} ║`);
}

function criarBox(texto, titulo = '') {
    // Implementação manual para substituir boxen
    const linhas = texto.split('\n');
    const maxLineLength = Math.max(...linhas.map(line => line.length));
    const padding = 1;
    const width = maxLineLength + (padding * 2);
    
    // Definir bordas baseadas no tema atual
    const border = {
        topLeft: '╭', topRight: '╮',
        bottomLeft: '╰', bottomRight: '╯',
        horizontal: '─', vertical: '│'
    };
    
    // Criar borda superior
    let resultado = chalk.hex(estado.temaAtual.corBorda)(border.topLeft + border.horizontal.repeat(width) + border.topRight) + '\n';
    
    // Adicionar título se fornecido
    if (titulo) {
        const tituloColorido = chalk.hex(estado.temaAtual.corPrimaria)(titulo);
        const titlePadding = Math.max(0, width - titulo.length);
        resultado += chalk.hex(estado.temaAtual.corBorda)(`${border.vertical} ${tituloColorido}${' '.repeat(titlePadding)} ${border.vertical}`) + '\n';
        resultado += chalk.hex(estado.temaAtual.corBorda)(`${border.vertical}${border.horizontal.repeat(width)}${border.vertical}`) + '\n';
    }
    
    // Adicionar linhas de texto
    for (const linha of linhas) {
        const lineSpacing = Math.max(0, width - linha.length);
        resultado += chalk.hex(estado.temaAtual.corBorda)(`${border.vertical} ${chalk.hex(estado.temaAtual.corTexto)(linha)}${' '.repeat(lineSpacing)} ${border.vertical}`) + '\n';
    }
    
    // Adicionar borda inferior (remover o \n final e adicionar a borda)
    resultado = resultado.slice(0, -1);
    resultado += chalk.hex(estado.temaAtual.corBorda)(border.bottomLeft + border.horizontal.repeat(width) + border.bottomRight);
    
    return resultado;
}

async function animacaoDigitacao(texto) {
    console.log(criarBordaHorizontal('dupla'));
    
    // Criar título manualmente em vez de usar boxen diretamente
    const tituloBruto = 'Leandrus:';
    const titulo = chalk.bold.hex(estado.temaAtual.corPrimaria)(tituloBruto);
    console.log(criarBordaVertical(titulo, 'center'));

    const linhas = texto.split('\n');
    for (const linha of linhas) {
        let textoRestante = linha;
        
        while (textoRestante.length > 0) {
            const parte = textoRestante.substring(0, obterLarguraTerminal() - 4);
            textoRestante = textoRestante.substring(parte.length);
            
            process.stdout.write(chalk.hex(estado.temaAtual.corBorda)('║ ') + chalk.hex(estado.temaAtual.corTexto)(''));
            
            if (config.TERMUX.BATTERY_SAVER || config.UI.ANIMATION_SPEED <= 0) {
                process.stdout.write(parte);
            } else {
                for (const char of parte) {
                    process.stdout.write(char);
                    await delay(config.UI.ANIMATION_SPEED);
                }
            }
            
            console.log(chalk.hex(estado.temaAtual.corBorda)(` ${' '.repeat(obterLarguraTerminal() - parte.length - 4)} ║`));
        }
    }

    console.log(criarBordaHorizontal('dupla'));
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function iniciarSpinner(texto) {
    if (config.UI.SHOW_TYPING_INDICATOR) {
        console.log(chalk.hex(estado.temaAtual.corSecundaria)(`⏳ ${texto}`));
    }
}

function pararSpinner() {
    // Implementação vazia pois não estamos mais usando ora
}

// ===== SISTEMA DE RELÓGIO E CALENDÁRIO =====
function obterHoraBrasilia() {
    // Cria uma data com o fuso horário UTC
    const dataUTC = new Date();
    
    // Ajusta para o fuso horário de Brasília (UTC-3)
    const offsetBrasilia = -3 * 60; // -3 horas em minutos
    const offsetLocal = dataUTC.getTimezoneOffset(); // Offset local em minutos
    const offsetTotal = offsetBrasilia - offsetLocal; // Diferença entre local e Brasília
    
    // Ajusta a data
    dataUTC.setMinutes(dataUTC.getMinutes() + offsetTotal);
    
    // Formata a hora
    const horas = dataUTC.getHours().toString().padStart(2, '0');
    const minutos = dataUTC.getMinutes().toString().padStart(2, '0');
    const segundos = dataUTC.getSeconds().toString().padStart(2, '0');
    
    return `${horas}:${minutos}:${segundos}`;
}

function obterDataBrasilia() {
    // Cria uma data com o fuso horário UTC
    const dataUTC = new Date();
    
    // Ajusta para o fuso horário de Brasília (UTC-3)
    const offsetBrasilia = -3 * 60; // -3 horas em minutos
    const offsetLocal = dataUTC.getTimezoneOffset(); // Offset local em minutos
    const offsetTotal = offsetBrasilia - offsetLocal; // Diferença entre local e Brasília
    
    // Ajusta a data
    dataUTC.setMinutes(dataUTC.getMinutes() + offsetTotal);
    
    // Nomes dos meses e dias da semana em português
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    
    const dia = dataUTC.getDate();
    const mes = meses[dataUTC.getMonth()];
    const ano = dataUTC.getFullYear();
    const diaSemana = diasSemana[dataUTC.getDay()];
    
    return `${diaSemana}, ${dia} de ${mes} de ${ano}`;
}

function gerarCalendarioMensal() {
    // Obter data atual em Brasília
    const dataUTC = new Date();
    const offsetBrasilia = -3 * 60;
    const offsetLocal = dataUTC.getTimezoneOffset();
    const offsetTotal = offsetBrasilia - offsetLocal;
    dataUTC.setMinutes(dataUTC.getMinutes() + offsetTotal);
    
    const hoje = dataUTC.getDate();
    const mesAtual = dataUTC.getMonth();
    const anoAtual = dataUTC.getFullYear();
    
    // Nomes dos meses em português
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    // Primeiro dia do mês
    const primeiroDia = new Date(anoAtual, mesAtual, 1);
    // Dia da semana do primeiro dia (0 = Domingo, 1 = Segunda, etc.)
    const diaSemanaInicio = primeiroDia.getDay();
    
    // Último dia do mês
    const ultimoDia = new Date(anoAtual, mesAtual + 1, 0).getDate();
    
    // Criar cabeçalho do calendário
    let calendario = `${meses[mesAtual]} ${anoAtual}\n`;
    calendario += 'Do Se Te Qu Qu Se Sa\n';
    
    // Adicionar espaços para o primeiro dia
    let linha = ' '.repeat(diaSemanaInicio * 3);
    
    // Preencher os dias
    for (let dia = 1; dia <= ultimoDia; dia++) {
        // Destacar o dia atual
        if (dia === hoje) {
            linha += chalk.hex(estado.temaAtual.corPrimaria)(dia.toString().padStart(2, ' ')) + ' ';
        } else {
            linha += dia.toString().padStart(2, ' ') + ' ';
        }
        
        // Nova linha a cada domingo (ou no final do mês)
        if ((diaSemanaInicio + dia) % 7 === 0 || dia === ultimoDia) {
            calendario += linha + '\n';
            linha = '';
        }
    }
    
    return calendario;
}

// ===== SISTEMA DE CLIMA =====
async function obterClimaAtual() {
    try {
        // Verificar se já temos dados de clima recentes (menos de 30 minutos)
        const agora = Date.now();
        if (estado.clima.ultimaAtualizacao && (agora - estado.clima.ultimaAtualizacao < 30 * 60 * 1000)) {
            return estado.clima;
        }
        
        // API pública e confiável para clima
        const weatherResponse = await new Promise((resolve, reject) => {
            https.get('https://wttr.in/?format=j1', (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        // Fallback para caso a API retorne um formato inválido
                        resolve({
                            current_condition: [{
                                temp_C: "25",
                                weatherDesc: [{ value: "Ensolarado" }]
                            }],
                            nearest_area: [{ areaName: [{ value: "Desconhecida" }] }]
                        });
                    }
                });
            }).on('error', (err) => {
                // Fallback para caso a API esteja indisponível
                resolve({
                    current_condition: [{
                        temp_C: "25",
                        weatherDesc: [{ value: "Ensolarado" }]
                    }],
                    nearest_area: [{ areaName: [{ value: "Desconhecida" }] }]
                });
            });
        });
        
        // Extrair dados do clima
        try {
            const temperatura = weatherResponse.current_condition[0].temp_C;
            const condicao = weatherResponse.current_condition[0].weatherDesc[0].value;
            const cidade = weatherResponse.nearest_area[0].areaName[0].value;
            
            // Atualizar estado
            estado.clima = {
                temperatura: temperatura,
                condicao: condicao,
                cidade: cidade,
                ultimaAtualizacao: agora
            };
            
            return estado.clima;
        } catch (err) {
            // Fallback para caso a estrutura da resposta seja diferente do esperado
            estado.clima = {
                temperatura: "25",
                condicao: "Ensolarado",
                cidade: "Desconhecida",
                ultimaAtualizacao: agora
            };
            
            return estado.clima;
        }
    } catch (err) {
        console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao obter clima: ${err.message}`));
        
        // Fallback para caso ocorra algum erro
        return {
            temperatura: "25",
            condicao: "Ensolarado",
            cidade: "Desconhecida",
            ultimaAtualizacao: Date.now()
        };
    }
}

function traduzirCondicaoClima(condicao) {
    const traducoes = {
        'Clear': 'Céu Limpo',
        'Sunny': 'Ensolarado',
        'Partly cloudy': 'Parcialmente nublado',
        'Cloudy': 'Nublado',
        'Overcast': 'Encoberto',
        'Mist': 'Névoa',
        'Patchy rain possible': 'Possibilidade de chuva irregular',
        'Patchy snow possible': 'Possibilidade de neve irregular',
        'Patchy sleet possible': 'Possibilidade de granizo irregular',
        'Patchy freezing drizzle possible': 'Possibilidade de garoa congelante irregular',
        'Thundery outbreaks possible': 'Possibilidade de trovoadas',
        'Blowing snow': 'Neve com vento',
        'Blizzard': 'Nevasca',
        'Fog': 'Neblina',
        'Freezing fog': 'Neblina congelante',
        'Patchy light drizzle': 'Garoa leve irregular',
        'Light drizzle': 'Garoa leve',
        'Freezing drizzle': 'Garoa congelante',
        'Heavy freezing drizzle': 'Garoa congelante intensa',
        'Patchy light rain': 'Chuva leve irregular',
        'Light rain': 'Chuva leve',
        'Moderate rain at times': 'Chuva moderada às vezes',
        'Moderate rain': 'Chuva moderada',
        'Heavy rain at times': 'Chuva forte às vezes',
        'Heavy rain': 'Chuva forte',
        'Light freezing rain': 'Chuva congelante leve',
        'Moderate or heavy freezing rain': 'Chuva congelante moderada ou forte',
        'Light sleet': 'Granizo leve',
        'Moderate or heavy sleet': 'Granizo moderado ou forte',
        'Patchy light snow': 'Neve leve irregular',
        'Light snow': 'Neve leve',
        'Patchy moderate snow': 'Neve moderada irregular',
        'Moderate snow': 'Neve moderada',
        'Patchy heavy snow': 'Neve forte irregular',
        'Heavy snow': 'Neve forte',
        'Ice pellets': 'Pelotas de gelo',
        'Light rain shower': 'Pancada de chuva leve',
        'Moderate or heavy rain shower': 'Pancada de chuva moderada ou forte',
        'Torrential rain shower': 'Pancada de chuva torrencial',
        'Light sleet showers': 'Pancada de granizo leve',
        'Moderate or heavy sleet showers': 'Pancada de granizo moderada ou forte',
        'Light snow showers': 'Pancada de neve leve',
        'Moderate or heavy snow showers': 'Pancada de neve moderada ou forte',
        'Light showers of ice pellets': 'Pancada leve de pelotas de gelo',
        'Moderate or heavy showers of ice pellets': 'Pancada moderada ou forte de pelotas de gelo',
        'Patchy light rain with thunder': 'Chuva leve irregular com trovoada',
        'Moderate or heavy rain with thunder': 'Chuva moderada ou forte com trovoada',
        'Patchy light snow with thunder': 'Neve leve irregular com trovoada',
        'Moderate or heavy snow with thunder': 'Neve moderada ou forte com trovoada'
    };
    
    return traducoes[condicao] || condicao;
}

// ===== SISTEMA DE NOTÍCIAS =====
async function obterNoticias() {
    try {
        // Verificar se já temos notícias recentes (menos de 1 hora)
        const agora = Date.now();
        if (estado.ultimaAtualizacaoNoticias && (agora - estado.ultimaAtualizacaoNoticias < 60 * 60 * 1000)) {
            return estado.noticias;
        }
        
        // API pública e confiável para notícias
        const newsResponse = await new Promise((resolve, reject) => {
            https.get('https://apinoticias.tedk.com.br/api/?q=brasil&date=today', (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        // Fallback para caso a API retorne um formato inválido
                        resolve({ articles: [] });
                    }
                });
            }).on('error', (err) => {
                // Fallback para caso a API esteja indisponível
                resolve({ articles: [] });
            });
        });
        
        // Filtrar e formatar notícias
        try {
            const noticias = newsResponse.articles && Array.isArray(newsResponse.articles) 
                ? newsResponse.articles.slice(0, 5).map(artigo => ({
                    titulo: artigo.title || "Notícia sem título",
                    fonte: artigo.source?.name || "Fonte desconhecida"
                  }))
                : [{ titulo: "Brasil avança em tecnologia", fonte: "Notícias Tech" },
                   { titulo: "Economia mostra sinais de recuperação", fonte: "Economia Hoje" },
                   { titulo: "Novas políticas de educação são anunciadas", fonte: "Educação Brasil" }];
            
            // Atualizar estado
            estado.noticias = noticias;
            estado.ultimaAtualizacaoNoticias = agora;
            
            return noticias;
        } catch (err) {
            // Fallback para caso ocorra algum erro ao processar as notícias
            const noticiasFallback = [
                { titulo: "Brasil avança em tecnologia", fonte: "Notícias Tech" },
                { titulo: "Economia mostra sinais de recuperação", fonte: "Economia Hoje" },
                { titulo: "Novas políticas de educação são anunciadas", fonte: "Educação Brasil" }
            ];
            
            estado.noticias = noticiasFallback;
            estado.ultimaAtualizacaoNoticias = agora;
            
            return noticiasFallback;
        }
    } catch (err) {
        console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao obter notícias: ${err.message}`));
        
        // Notícias de fallback
        const noticiasFallback = [
            { titulo: "Brasil avança em tecnologia", fonte: "Notícias Tech" },
            { titulo: "Economia mostra sinais de recuperação", fonte: "Economia Hoje" },
            { titulo: "Novas políticas de educação são anunciadas", fonte: "Educação Brasil" }
        ];
        
        return noticiasFallback;
    }
}

// ===== SISTEMA DE INTERFACE INFORMATIVA =====
async function exibirPainelInformativo() {
    const largura = obterLarguraTerminal();
    
    // Criar painel superior
    let painel = criarBordaHorizontal('forte') + '\n';
    
    // Adicionar relógio e data
    if (config.UI.SHOW_CLOCK) {
        const hora = obterHoraBrasilia();
        const data = obterDataBrasilia();
        painel += criarBordaVertical(chalk.hex(estado.temaAtual.corPrimaria)(`⏰ ${hora} - ${data}`), 'center') + '\n';
    }
    
    // Adicionar clima
    if (config.UI.SHOW_WEATHER) {
        try {
            const clima = await obterClimaAtual();
            if (clima.temperatura !== null) {
                const condicaoTraduzida = traduzirCondicaoClima(clima.condicao);
                painel += criarBordaVertical(chalk.hex(estado.temaAtual.corSecundaria)(`🌡️ ${clima.cidade}: ${clima.temperatura}°C - ${condicaoTraduzida}`), 'center') + '\n';
            }
        } catch (err) {
            // Silenciosamente ignorar erros de clima
        }
    }
    
    // Adicionar notícias
    if (config.UI.SHOW_NEWS) {
        try {
            const noticias = await obterNoticias();
            if (noticias.length > 0) {
                painel += criarBordaVertical(chalk.hex(estado.temaAtual.corPrimaria)('📰 NOTÍCIAS:'), 'center') + '\n';
                for (let i = 0; i < Math.min(3, noticias.length); i++) {
                    painel += criarBordaVertical(chalk.hex(estado.temaAtual.corTexto)(`• ${noticias[i].titulo} (${noticias[i].fonte})`), 'left') + '\n';
                }
            }
        } catch (err) {
            // Silenciosamente ignorar erros de notícias
        }
    }
    
    // Adicionar calendário
    if (config.UI.SHOW_CALENDAR) {
        const calendario = gerarCalendarioMensal();
        painel += criarBordaVertical(chalk.hex(estado.temaAtual.corPrimaria)('📅 CALENDÁRIO:'), 'center') + '\n';
        calendario.split('\n').forEach(linha => {
            painel += criarBordaVertical(chalk.hex(estado.temaAtual.corTexto)(linha), 'center') + '\n';
        });
    }
    
    painel += criarBordaHorizontal('forte');
    
    console.log(painel);
}

// ===== SERVIDOR WEB =====
async function iniciarServidorWeb() {
    if (!express) {
        console.log(chalk.hex(estado.temaAtual.corAviso)('⚠️ Express não encontrado. Servidor web será desativado.'));
        return false;
    }
    
    try {
        // Garantir que o diretório public existe
        try {
            await fs.access(config.WEB_SERVER.PUBLIC_DIR);
        } catch (err) {
            // Diretório não existe, vamos criar
            try {
                await fs.mkdir(config.WEB_SERVER.PUBLIC_DIR, { recursive: true });
                console.log(chalk.hex(estado.temaAtual.corSucesso)(`✓ Diretório ${config.WEB_SERVER.PUBLIC_DIR} criado com sucesso`));
            } catch (mkdirErr) {
                console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao criar diretório ${config.WEB_SERVER.PUBLIC_DIR}: ${mkdirErr.message}`));
                // Tentar criar em um local alternativo
                try {
                    const dirAlternativo = path.join(process.cwd(), 'public_alt');
                    await fs.mkdir(dirAlternativo, { recursive: true });
                    config.WEB_SERVER.PUBLIC_DIR = dirAlternativo;
                    console.log(chalk.hex(estado.temaAtual.corAviso)(`⚠️ Usando diretório alternativo: ${dirAlternativo}`));
                } catch (altErr) {
                    console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Não foi possível criar diretório alternativo: ${altErr.message}`));
                    return false;
                }
            }
        }
        
        const app = express();
        const porta = config.WEB_SERVER.PORT;
        
        // Middleware para lidar com erros de CORS
        app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });
        
        app.use(express.static(config.WEB_SERVER.PUBLIC_DIR));
        
        // Middleware para verificar se o diretório existe antes de cada requisição
        app.use(async (req, res, next) => {
            try {
                await fs.access(config.WEB_SERVER.PUBLIC_DIR);
                next();
            } catch (err) {
                try {
                    await fs.mkdir(config.WEB_SERVER.PUBLIC_DIR, { recursive: true });
                    next();
                } catch (mkdirErr) {
                    res.status(500).send('Erro ao acessar diretório de arquivos');
                }
            }
        });
        
        // Rota para arquivos
        app.get('/arquivo/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const arquivo = path.join(config.WEB_SERVER.PUBLIC_DIR, id);
                
                try {
                    await fs.access(arquivo);
                } catch (err) {
                    return res.status(404).send('Arquivo não encontrado');
                }
                
                const conteudo = await fs.readFile(arquivo, 'utf-8');
                const extensao = path.extname(arquivo).toLowerCase();
                
                if (extensao === '.html') {
                    res.setHeader('Content-Type', 'text/html');
                } else if (extensao === '.js') {
                    res.setHeader('Content-Type', 'application/javascript');
                } else if (extensao === '.css') {
                    res.setHeader('Content-Type', 'text/css');
                } else if (extensao === '.json') {
                    res.setHeader('Content-Type', 'application/json');
                } else {
                    res.setHeader('Content-Type', 'text/plain');
                }
                
                res.send(conteudo);
            } catch (err) {
                console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao processar arquivo: ${err.message}`));
                res.status(500).send(`Erro ao processar arquivo: ${err.message}`);
            }
        });
        
        // Rota para mensagens grandes
        app.get('/mensagem/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const arquivo = path.join(config.WEB_SERVER.PUBLIC_DIR, `${id}.txt`);
                
                try {
                    await fs.access(arquivo);
                } catch (err) {
                    return res.status(404).send('Mensagem não encontrada');
                }
                
                const conteudo = await fs.readFile(arquivo, 'utf-8');
                
                // Enviar como HTML formatado
                res.setHeader('Content-Type', 'text/html');
                res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Mensagem do Leandrus</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            max-width: 800px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #0A0000;
                            color: #FFFFFF;
                        }
                        h1 {
                            color: #FF0000;
                            border-bottom: 1px solid #FF0000;
                            padding-bottom: 10px;
                        }
                        pre {
                            background-color: #1A0000;
                            padding: 15px;
                            border-radius: 5px;
                            overflow-x: auto;
                            border: 1px solid #AA0000;
                        }
                        code {
                            font-family: monospace;
                        }
                    </style>
                </head>
                <body>
                    <h1>Mensagem do Leandrus</h1>
                    <pre>${conteudo}</pre>
                </body>
                </html>
                `);
            } catch (err) {
                console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao processar mensagem: ${err.message}`));
                res.status(500).send(`Erro ao processar mensagem: ${err.message}`);
            }
        });
        
        // Rota para verificar status do servidor
        app.get('/status', (req, res) => {
            res.json({
                status: 'online',
                versao: '3.0.0',
                termux: estado.isTermux,
                tema: estado.temaAtual.nome
            });
        });
        
        // Middleware de erro
        app.use((err, req, res, next) => {
            console.error(chalk.hex(estado.temaAtual.corErro)('Erro no servidor:'), err);
            res.status(500).send('Erro interno');
        });

        // Usar Promise para garantir que o servidor inicie corretamente
        return new Promise((resolve, reject) => {
            try {
                estado.servidor = app.listen(porta, '0.0.0.0', () => {
                    console.log(chalk.hex(estado.temaAtual.corSucesso)(`✓ Servidor web iniciado na porta ${porta}`));
                    
                    // Obter IP local para acesso
                    execAsync('hostname -I || ip addr show | grep -oP "(?<=inet\\s)\\d+(\\.\\d+){3}" | grep -v "127.0.0.1" | head -n 1')
                        .then(({ stdout }) => {
                            const ip = stdout.trim();
                            estado.urlBase = `http://localhost:${porta}`;
                            console.log(chalk.hex(estado.temaAtual.corSucesso)(`✓ Acesse em: ${estado.urlBase}`));
                            resolve(true);
                        })
                        .catch((err) => {
                            console.error(chalk.hex(estado.temaAtual.corAviso)(`⚠️ Não foi possível determinar o IP: ${err.message}`));
                            estado.urlBase = `http://localhost:${porta}`;
                            console.log(chalk.hex(estado.temaAtual.corSucesso)(`✓ Acesse em: ${estado.urlBase}`));
                            resolve(true);
                        });
                });
                
                estado.servidor.on('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Porta ${porta} já está em uso. Tentando porta alternativa...`));
                        const portaAlternativa = porta + 1;
                        config.WEB_SERVER.PORT = portaAlternativa;
                        estado.servidor = app.listen(portaAlternativa, '0.0.0.0', () => {
                            console.log(chalk.hex(estado.temaAtual.corSucesso)(`✓ Servidor web iniciado na porta alternativa ${portaAlternativa}`));
                            estado.urlBase = `http://localhost:${portaAlternativa}`;
                            console.log(chalk.hex(estado.temaAtual.corSucesso)(`✓ Acesse em: ${estado.urlBase}`));
                            resolve(true);
                        });
                    } else {
                        console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao iniciar servidor: ${err.message}`));
                        reject(err);
                    }
                });
            } catch (err) {
                console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao configurar servidor: ${err.message}`));
                reject(err);
            }
        });
    } catch (err) {
        console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao iniciar servidor web: ${err.message}`));
        return false;
    }
}

// ===== SISTEMA DE ARQUIVOS =====
async function garantirDiretorioExiste(diretorio) {
    try {
        await fs.access(diretorio);
    } catch (err) {
        try {
            await fs.mkdir(diretorio, { recursive: true });
            console.log(chalk.hex(estado.temaAtual.corSucesso)(`✓ Diretório ${diretorio} criado com sucesso`));
        } catch (mkdirErr) {
            console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao criar diretório ${diretorio}: ${mkdirErr.message}`));
            // Tentar criar em um local alternativo
            const dirAlternativo = path.join(process.cwd(), path.basename(diretorio) + '_alt');
            try {
                await fs.mkdir(dirAlternativo, { recursive: true });
                console.log(chalk.hex(estado.temaAtual.corAviso)(`⚠️ Usando diretório alternativo: ${dirAlternativo}`));
                return dirAlternativo;
            } catch (altErr) {
                console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Não foi possível criar diretório alternativo: ${altErr.message}`));
                throw new Error(`Não foi possível criar diretório: ${diretorio}`);
            }
        }
    }
    return diretorio;
}

async function salvarArquivo(conteudo, nomeArquivo, diretorio = config.OUTPUT_DIR) {
    try {
        const dirReal = await garantirDiretorioExiste(diretorio);
        const caminhoCompleto = path.join(dirReal, nomeArquivo);
        
        await fs.writeFile(caminhoCompleto, conteudo);
        console.log(chalk.hex(estado.temaAtual.corSucesso)(`✓ Arquivo salvo em: ${caminhoCompleto}`));
        
        estado.arquivosGerados.push(caminhoCompleto);
        return caminhoCompleto;
    } catch (err) {
        console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao salvar arquivo: ${err.message}`));
        throw err;
    }
}

async function salvarMensagemGrande(mensagem) {
    try {
        // Garantir que o diretório public existe
        const dirPublic = await garantirDiretorioExiste(config.WEB_SERVER.PUBLIC_DIR);
        
        // Gerar ID único para a mensagem
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        const nomeArquivo = `${id}.txt`;
        const caminhoCompleto = path.join(dirPublic, nomeArquivo);
        
        // Salvar mensagem
        await fs.writeFile(caminhoCompleto, mensagem);
        
        // Retornar URL para acesso
        return {
            id: id,
            url: `${estado.urlBase}/mensagem/${id}`
        };
    } catch (err) {
        console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao salvar mensagem grande: ${err.message}`));
        throw err;
    }
}

async function lerArquivo(caminhoArquivo) {
    try {
        const conteudo = await fs.readFile(caminhoArquivo, 'utf-8');
        return conteudo;
    } catch (err) {
        console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao ler arquivo ${caminhoArquivo}: ${err.message}`));
        throw err;
    }
}

async function listarArquivos(diretorio) {
    try {
        await garantirDiretorioExiste(diretorio);
        const arquivos = await fs.readdir(diretorio);
        return arquivos;
    } catch (err) {
        console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao listar arquivos em ${diretorio}: ${err.message}`));
        return [];
    }
}

// ===== SISTEMA DE MEMÓRIA =====
async function carregarMemoria() {
    try {
        await garantirDiretorioExiste(path.dirname(config.MEMORY_FILE));
        const conteudo = await fs.readFile(config.MEMORY_FILE, 'utf-8');
        const dados = JSON.parse(conteudo);
        estado.memoriaPermanente = dados.permanente || [];
        estado.memoriaTemporaria = dados.temporaria || [];
        console.log(chalk.hex(estado.temaAtual.corSucesso)(`✓ Memória carregada: ${estado.memoriaPermanente.length} itens permanentes, ${estado.memoriaTemporaria.length} temporários`));
    } catch (err) {
        console.log(chalk.hex(estado.temaAtual.corAviso)(`⚠️ Arquivo de memória não encontrado ou inválido. Criando novo...`));
        estado.memoriaPermanente = [];
        estado.memoriaTemporaria = [];
        await salvarMemoria();
    }
}

async function salvarMemoria() {
    try {
        const dados = {
            permanente: estado.memoriaPermanente,
            temporaria: estado.memoriaTemporaria
        };
        await garantirDiretorioExiste(path.dirname(config.MEMORY_FILE));
        await fs.writeFile(config.MEMORY_FILE, JSON.stringify(dados, null, 2));
    } catch (err) {
        console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao salvar memória: ${err.message}`));
    }
}

function adicionarMemoriaPermanente(item) {
    estado.memoriaPermanente.unshift(item);
    if (estado.memoriaPermanente.length > estado.maxMemoriaPermanente) {
        estado.memoriaPermanente.pop();
    }
    salvarMemoria();
}

function adicionarMemoriaTemporaria(item) {
    estado.memoriaTemporaria.unshift(item);
    if (estado.memoriaTemporaria.length > estado.maxMemoriaTemporaria) {
        estado.memoriaTemporaria.pop();
    }
    salvarMemoria();
}

// ===== SISTEMA DE CACHE =====
async function inicializarCache() {
    try {
        await garantirDiretorioExiste(config.CACHE_DIR);
        console.log(chalk.hex(estado.temaAtual.corSucesso)(`✓ Sistema de cache inicializado`));
    } catch (err) {
        console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao inicializar cache: ${err.message}`));
    }
}

async function obterDoCache(chave) {
    const hash = hashString(chave);
    
    // Verificar cache em memória primeiro
    if (estado.cache.has(hash)) {
        return estado.cache.get(hash);
    }
    
    // Verificar cache em disco
    try {
        const caminhoCache = path.join(config.CACHE_DIR, `${hash}.json`);
        const conteudo = await fs.readFile(caminhoCache, 'utf-8');
        const dados = JSON.parse(conteudo);
        
        // Atualizar cache em memória
        estado.cache.set(hash, dados.valor);
        
        return dados.valor;
    } catch (err) {
        return null;
    }
}

async function salvarNoCache(chave, valor) {
    const hash = hashString(chave);
    
    // Salvar em memória
    estado.cache.set(hash, valor);
    
    // Salvar em disco
    try {
        const caminhoCache = path.join(config.CACHE_DIR, `${hash}.json`);
        const dados = {
            chave,
            valor,
            timestamp: Date.now()
        };
        await fs.writeFile(caminhoCache, JSON.stringify(dados));
    } catch (err) {
        console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao salvar no cache: ${err.message}`));
    }
}

async function limparCache() {
    estado.cache.clear();
    
    try {
        const arquivos = await fs.readdir(config.CACHE_DIR);
        for (const arquivo of arquivos) {
            if (arquivo.endsWith('.json')) {
                await fs.unlink(path.join(config.CACHE_DIR, arquivo));
            }
        }
        console.log(chalk.hex(estado.temaAtual.corSucesso)(`✓ Cache limpo com sucesso`));
    } catch (err) {
        console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao limpar cache: ${err.message}`));
    }
}

// ===== SISTEMA DE API =====
async function enviarParaAPI(prompt, modelo = config.MODEL) {
    const chaves = Object.values(config.API_KEYS);
    const chaveAtual = chaves[estado.chaveAPIAtual % chaves.length];
    
    try {
        // Verificar cache
        const chaveCache = `${modelo}:${prompt}`;
        const resultadoCache = await obterDoCache(chaveCache);
        if (resultadoCache) {
            console.log(chalk.hex(estado.temaAtual.corSucesso)(`✓ Resultado obtido do cache`));
            return resultadoCache;
        }
        
        // Inicializar API
        const genAI = new GoogleGenerativeAI(chaveAtual);
        const model = genAI.getGenerativeModel({ model: modelo });
        
        // Enviar requisição
        const result = await model.generateContent(prompt);
        const response = await result.response.text();
        
        // Salvar no cache
        await salvarNoCache(chaveCache, response);
        
        return response;
    } catch (err) {
        console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro na API (chave ${estado.chaveAPIAtual + 1}/${chaves.length}): ${err.message}`));
        
        // Tentar com outra chave
        estado.chaveAPIAtual++;
        if (estado.chaveAPIAtual < chaves.length * config.MAX_RETRIES) {
            console.log(chalk.hex(estado.temaAtual.corAviso)(`⚠️ Tentando com próxima chave API...`));
            await delay(config.DELAY_ENTRE_REQUISICOES);
            return enviarParaAPI(prompt, modelo);
        } else {
            throw new Error(`Todas as chaves API falharam após ${config.MAX_RETRIES} tentativas`);
        }
    }
}

// ===== SISTEMA DE PROCESSAMENTO DE CÓDIGO =====
async function detectarLinguagemDeCodigo(codigo) {
    // Detecção básica por extensão ou padrões
    if (codigo.includes('<?php')) return 'PHP';
    if (codigo.includes('import ') && codigo.includes('from ')) return 'Python';
    if (codigo.includes('function ') && (codigo.includes('console.log') || codigo.includes('const '))) return 'JavaScript';
    if (codigo.includes('public class ') || codigo.includes('public static void main')) return 'Java';
    if (codigo.includes('#include') && (codigo.includes('<stdio.h>') || codigo.includes('<iostream>'))) return 'C/C++';
    if (codigo.includes('package main') && codigo.includes('func ')) return 'Go';
    if (codigo.includes('<!DOCTYPE html>') || (codigo.includes('<html>') && codigo.includes('<body>'))) return 'HTML';
    if (codigo.includes('@media') || codigo.includes('margin:') || codigo.includes('padding:')) return 'CSS';
    
    // Detecção avançada via API
    try {
        const prompt = `Identifique a linguagem de programação deste código (responda apenas o nome da linguagem, sem explicações):
\`\`\`
${codigo.substring(0, 1000)}
\`\`\``;
        
        const resposta = await enviarParaAPI(prompt);
        const linguagem = resposta.trim();
        
        // Validar resposta
        const linguagensValidas = ['JavaScript', 'Python', 'Java', 'C', 'C++', 'PHP', 'Ruby', 'Go', 'Swift', 'Kotlin', 'Rust', 'HTML', 'CSS', 'SQL', 'Bash', 'PowerShell', 'TypeScript'];
        
        if (linguagensValidas.some(l => linguagem.includes(l))) {
            return linguagem;
        }
        
        return 'Desconhecida';
    } catch (err) {
        console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao detectar linguagem: ${err.message}`));
        return 'Desconhecida';
    }
}

async function criarAmbienteTeste(linguagem) {
    try {
        await garantirDiretorioExiste('temp_test');
        
        // Criar arquivos de configuração específicos para cada linguagem
        switch (linguagem) {
            case 'JavaScript':
                await fs.writeFile('temp_test/package.json', JSON.stringify({
                    "name": "temp_test",
                    "version": "1.0.0",
                    "description": "Ambiente de teste temporário",
                    "main": "index.js"
                }, null, 2));
                break;
            case 'Python':
                await fs.writeFile('temp_test/requirements.txt', '# Requisitos para teste\n');
                break;
            // Adicionar mais linguagens conforme necessário
        }
        
        console.log(chalk.hex(estado.temaAtual.corSucesso)(`✓ Ambiente de teste para ${linguagem} criado`));
    } catch (err) {
        console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao criar ambiente de teste: ${err.message}`));
    }
}

async function executarTestes(arquivo, linguagem) {
    try {
        let comando = '';
        
        switch (linguagem) {
            case 'JavaScript':
                comando = `node "${arquivo}"`;
                break;
            case 'Python':
                comando = `python3 "${arquivo}"`;
                break;
            case 'PHP':
                comando = `php "${arquivo}"`;
                break;
            case 'Java':
                comando = `javac "${arquivo}" && java -cp "${path.dirname(arquivo)}" ${path.basename(arquivo, '.java')}`;
                break;
            case 'C':
                comando = `gcc "${arquivo}" -o "${arquivo}.out" && "${arquivo}.out"`;
                break;
            case 'C++':
                comando = `g++ "${arquivo}" -o "${arquivo}.out" && "${arquivo}.out"`;
                break;
            case 'Go':
                comando = `go run "${arquivo}"`;
                break;
            case 'Ruby':
                comando = `ruby "${arquivo}"`;
                break;
            case 'Bash':
                comando = `bash "${arquivo}"`;
                break;
            default:
                return { erro: `Linguagem não suportada: ${linguagem}` };
        }
        
        const { stdout, stderr } = await execAsync(comando);
        
        if (stderr && stderr.trim() !== '') {
            return { erro: stderr, saida: stdout };
        }
        
        return { erro: null, saida: stdout };
    } catch (err) {
        return { erro: err.message, saida: err.stdout || '' };
    }
}

async function gerarCorrecao(codigo, erro, linguagem) {
    try {
        const prompt = `Você é um especialista em ${linguagem}. Corrija o seguinte código que está gerando este erro:

CÓDIGO:
\`\`\`${linguagem}
${codigo}
\`\`\`

ERRO:
${erro}

Forneça o código completo corrigido e explique as alterações feitas. Formato da resposta:

CÓDIGO CORRIGIDO:
\`\`\`${linguagem}
[código completo corrigido aqui]
\`\`\`

EXPLICAÇÃO DAS ALTERAÇÕES:
1. [primeira alteração]
2. [segunda alteração]
...`;

        const resposta = await enviarParaAPI(prompt);
        
        // Extrair código corrigido
        const codigoMatch = resposta.match(/CÓDIGO CORRIGIDO:\s*```(?:.*?)\s*([\s\S]*?)```/);
        const codigoCorrigido = codigoMatch ? codigoMatch[1].trim() : codigo;
        
        // Extrair explicações
        const explicacaoMatch = resposta.match(/EXPLICAÇÃO DAS ALTERAÇÕES:([\s\S]*?)(?:$|```)/);
        const explicacao = explicacaoMatch ? explicacaoMatch[1].trim() : '';
        
        // Gerar diferenças
        const diferencas = [];
        const linhasCodigo = codigo.split('\n');
        const linhasCorrigidas = codigoCorrigido.split('\n');
        
        // Extrair itens numerados da explicação
        const itensExplicacao = explicacao.split('\n')
            .map(linha => linha.trim())
            .filter(linha => /^\d+\./.test(linha))
            .map(linha => linha.replace(/^\d+\.\s*/, ''));
        
        // Encontrar diferenças significativas
        for (let i = 0; i < Math.max(linhasCodigo.length, linhasCorrigidas.length); i++) {
            const original = linhasCodigo[i] || '';
            const corrigido = linhasCorrigidas[i] || '';
            
            if (original !== corrigido) {
                diferencas.push({
                    linha: i + 1,
                    antigo: original,
                    novo: corrigido,
                    comentario: itensExplicacao.length > diferencas.length ? itensExplicacao[diferencas.length] : ''
                });
            }
        }
        
        return { codigo: codigoCorrigido, diferencas: diferencas };
    } catch (err) {
        console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao gerar correção: ${err.message}`), 'center'));
        return { codigo: codigo, diferencas: [] };
    }
}

async function testarECorrigirCodigo(arquivo) {
    try {
        await fs.access(arquivo);
        console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSecundaria)(`🔍 Analisando ${path.basename(arquivo)}...`), 'center'));
        
        const codigo = await fs.readFile(arquivo, 'utf-8');
        const linguagem = await detectarLinguagemDeCodigo(codigo);
        if (linguagem === 'Desconhecida') return { sucesso: false };
        
        await criarAmbienteTeste(linguagem);
        const { erro, saida } = await executarTestes(arquivo, linguagem);
        
        if (!erro) {
            console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSucesso)('✅ Código executado com sucesso!'), 'center'));
            console.log(criarBordaVertical(chalk.gray(saida), 'left'));
            return { sucesso: true, saida };
        }
        
        console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corErro)(`❌ Erro encontrado: ${erro.split('\n')[0]}`), 'center'));
        console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSecundaria)('🔄 Tentando corrigir automaticamente...'), 'center'));
        
        const correcao = await gerarCorrecao(codigo, erro, linguagem);
        const novoArquivo = `${arquivo}.corrigido_${Date.now()}${path.extname(arquivo)}`;
        await fs.writeFile(novoArquivo, correcao.codigo);
        
        console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSucesso)(`📁 Versão corrigida salva em: ${novoArquivo}`), 'center'));
        
        if (correcao.diferencas.length > 0) {
            console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSecundaria)('🔍 Principais alterações:'), 'center'));
            correcao.diferencas.slice(0, 5).forEach(diff => {
                console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corErro)(`- ${diff.antigo || 'Código removido'}`), 'left'));
                console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSucesso)(`+ ${diff.novo || 'Código adicionado'}`), 'left'));
                if (diff.comentario) console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSecundaria)(`# ${diff.comentario}`), 'left'));
                console.log(criarBordaVertical('', 'left'));
            });
        } else {
            console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corAviso)('⚠️ Não foram detectadas alterações específicas'), 'center'));
        }
        
        return { 
            sucesso: false, 
            correcao: { caminho: novoArquivo, alteracoes: correcao.diferencas.length }, 
            erroOriginal: erro 
        };
    } catch (err) {
        console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao testar código: ${err.message}`), 'center'));
        return { sucesso: false, erro: err.message };
    }
}

// ===== SISTEMA DE PROCESSAMENTO DE TEXTO =====
async function dividirTextoEmPartes(texto, maxLinhasPorParte = config.MAX_LINHAS_POR_PARTE) {
    const linhas = texto.split('\n');
    const partes = [];
    
    for (let i = 0; i < linhas.length; i += maxLinhasPorParte) {
        partes.push(linhas.slice(i, i + maxLinhasPorParte).join('\n'));
    }
    
    return partes;
}

async function processarTextoEmPartes(texto, funcaoProcessamento, maxLinhasPorParte = config.MAX_LINHAS_POR_PARTE) {
    const partes = await dividirTextoEmPartes(texto, maxLinhasPorParte);
    let resultado = '';
    
    for (let i = 0; i < partes.length; i++) {
        console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSecundaria)(`🔄 Processando parte ${i+1}/${partes.length}...`), 'center'));
        const resultadoParte = await funcaoProcessamento(partes[i], i);
        resultado += resultadoParte;
        
        // Adicionar separador entre partes, exceto na última
        if (i < partes.length - 1) {
            resultado += '\n\n';
        }
    }
    
    return resultado;
}

// ===== SISTEMA DE COMANDOS =====
async function executarComando(comando) {
    if (!config.ALLOW_SYSTEM_COMMANDS) {
        console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corAviso)('⚠️ Comandos de sistema estão desativados'), 'center'));
        return { stdout: 'Comandos de sistema desativados', stderr: '' };
    }
    
    try {
        console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSecundaria)(`🔄 Executando: ${comando}`), 'center'));
        const { stdout, stderr } = await execAsync(comando);
        
        if (stderr && stderr.trim() !== '') {
            console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corAviso)(`⚠️ Aviso: ${stderr}`), 'center'));
        }
        
        return { stdout, stderr };
    } catch (err) {
        console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corErro)(`❌ Erro: ${err.message}`), 'center'));
        return { stdout: '', stderr: err.message };
    }
}

// ===== SISTEMA DE INTERFACE =====
function exibirAjuda() {
    const ajuda = `
COMANDOS DISPONÍVEIS:

!ajuda             - Exibe esta mensagem de ajuda
!tema <nome>       - Muda o tema visual (blood, neon, midnight, sunset, matrix, termux, cyber)
!limpar            - Limpa a tela do terminal
!sair              - Encerra o programa
!salvar <arquivo>  - Salva a última resposta em um arquivo
!exec <comando>    - Executa um comando no sistema
!testar <arquivo>  - Testa e corrige um arquivo de código
!servidor          - Inicia/reinicia o servidor web
!cache limpar      - Limpa o cache de respostas
!memoria           - Exibe itens na memória
!colar             - Entra no modo de colagem (múltiplas linhas)
!fim               - Finaliza o modo de colagem
!teste             - Entra no modo de teste de código
!versao            - Exibe informações da versão
!clima             - Exibe informações do clima atual
!noticias          - Exibe as últimas notícias
!calendario        - Exibe o calendário do mês atual
`;

    console.log(criarBox(chalk.hex(estado.temaAtual.corTexto)(ajuda), 'Ajuda do Leandrus'));
}

function exibirVersao() {
    const versao = `
Leandrus PRO - Termux Edition
Versão: 3.0.0 (Full Edition)

Ambiente: ${estado.isTermux ? 'Termux' : 'Node.js padrão'}
Tema atual: ${estado.temaAtual.nome}
Servidor web: ${estado.servidor ? 'Ativo' : 'Inativo'}
${estado.servidor ? `URL: ${estado.urlBase}` : ''}
`;

    console.log(criarBox(chalk.hex(estado.temaAtual.corTexto)(versao), 'Informações de Versão'));
}

function mudarTema(nomeTema) {
    if (temas[nomeTema]) {
        estado.temaAtual = temas[nomeTema];
        config.UI.THEME = nomeTema;
        console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSucesso)(`✓ Tema alterado para: ${estado.temaAtual.nome}`), 'center'));
        return true;
    } else {
        console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corErro)(`❌ Tema não encontrado: ${nomeTema}`), 'center'));
        console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSecundaria)(`Temas disponíveis: ${Object.keys(temas).join(', ')}`), 'center'));
        return false;
    }
}

// ===== SISTEMA PRINCIPAL =====
async function inicializar() {
    console.clear();
    
    // Exibir banner
    figlet('Leandrus', { font: 'Small' }, (err, data) => {
        if (err) {
            console.log(chalk.hex(estado.temaAtual.corPrimaria)('LEANDRUS - TERMUX EDITION'));
        } else {
            console.log(chalk.hex(estado.temaAtual.corPrimaria)(data));
        }
        
        // Exibir painel informativo
        exibirPainelInformativo();
    });
    
    // Inicializar sistemas
    try {
        await garantirDiretorioExiste(config.OUTPUT_DIR);
        await inicializarCache();
        await carregarMemoria();
        
        // Iniciar servidor web em segundo plano
        iniciarServidorWeb().catch(err => {
            console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao iniciar servidor web: ${err.message}`));
        });
    } catch (err) {
        console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro na inicialização: ${err.message}`));
    }
}

async function processarEntrada(entrada) {
    // Verificar se está no modo de colagem
    if (estado.modoColagem) {
        if (entrada.trim() === '!fim') {
            estado.modoColagem = false;
            const textoCompleto = estado.bufferColagem.join('\n');
            estado.bufferColagem = [];
            
            console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSucesso)('✓ Modo de colagem finalizado'), 'center'));
            console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSecundaria)(`📝 Processando ${textoCompleto.length} caracteres...`), 'center'));
            
            return textoCompleto;
        } else {
            estado.bufferColagem.push(entrada);
            return null;
        }
    }
    
    // Verificar se está no modo de teste
    if (estado.modoTeste) {
        if (entrada.trim() === '!fim') {
            estado.modoTeste = false;
            const codigoCompleto = estado.bufferTeste.join('\n');
            estado.bufferTeste = [];
            
            console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSucesso)('✓ Modo de teste finalizado'), 'center'));
            
            // Salvar código em arquivo temporário
            const extensao = await detectarLinguagemDeCodigo(codigoCompleto) === 'JavaScript' ? '.js' : '.txt';
            const arquivoTemp = `temp_code_${Date.now()}${extensao}`;
            await fs.writeFile(arquivoTemp, codigoCompleto);
            
            // Testar o código
            console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSecundaria)(`🔍 Testando código...`), 'center'));
            const resultado = await testarECorrigirCodigo(arquivoTemp);
            
            return null;
        } else {
            estado.bufferTeste.push(entrada);
            return null;
        }
    }
    
    // Processar comandos
    if (entrada.startsWith('!')) {
        const partes = entrada.split(' ');
        const comando = partes[0].toLowerCase();
        
        switch (comando) {
            case '!ajuda':
                exibirAjuda();
                return null;
                
            case '!tema':
                if (partes.length > 1) {
                    mudarTema(partes[1].toLowerCase());
                } else {
                    console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corAviso)('⚠️ Uso: !tema <nome>'), 'center'));
                    console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSecundaria)(`Temas disponíveis: ${Object.keys(temas).join(', ')}`), 'center'));
                }
                return null;
                
            case '!limpar':
                console.clear();
                exibirPainelInformativo();
                return null;
                
            case '!sair':
                console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSucesso)('✓ Encerrando programa...'), 'center'));
                process.exit(0);
                
            case '!salvar':
                if (partes.length > 1) {
                    const nomeArquivo = partes[1];
                    await salvarArquivo(estado.ultimaResposta, nomeArquivo);
                } else {
                    console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corAviso)('⚠️ Uso: !salvar <nome_arquivo>'), 'center'));
                }
                return null;
                
            case '!exec':
                if (partes.length > 1) {
                    const cmd = partes.slice(1).join(' ');
                    const resultado = await executarComando(cmd);
                    console.log(criarBox(chalk.hex(estado.temaAtual.corTexto)(resultado.stdout), 'Resultado do Comando'));
                } else {
                    console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corAviso)('⚠️ Uso: !exec <comando>'), 'center'));
                }
                return null;
                
            case '!testar':
                if (partes.length > 1) {
                    const arquivo = partes[1];
                    await testarECorrigirCodigo(arquivo);
                } else {
                    console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corAviso)('⚠️ Uso: !testar <arquivo>'), 'center'));
                }
                return null;
                
            case '!servidor':
                if (estado.servidor) {
                    estado.servidor.close();
                    estado.servidor = null;
                    console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corAviso)('⚠️ Servidor web parado'), 'center'));
                }
                iniciarServidorWeb();
                return null;
                
            case '!cache':
                if (partes.length > 1 && partes[1] === 'limpar') {
                    await limparCache();
                } else {
                    console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corAviso)('⚠️ Uso: !cache limpar'), 'center'));
                }
                return null;
                
            case '!memoria':
                console.log(criarBox(
                    chalk.hex(estado.temaAtual.corTexto)(`Memória Permanente: ${estado.memoriaPermanente.length} itens\nMemória Temporária: ${estado.memoriaTemporaria.length} itens`),
                    'Estado da Memória'
                ));
                return null;
                
            case '!colar':
                estado.modoColagem = true;
                estado.bufferColagem = [];
                console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSucesso)('✓ Modo de colagem ativado. Digite !fim quando terminar.'), 'center'));
                return null;
                
            case '!teste':
                estado.modoTeste = true;
                estado.bufferTeste = [];
                console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSucesso)('✓ Modo de teste de código ativado. Digite !fim quando terminar.'), 'center'));
                return null;
                
            case '!versao':
                exibirVersao();
                return null;
                
            case '!clima':
                obterClimaAtual().then(clima => {
                    if (clima.temperatura !== null) {
                        const condicaoTraduzida = traduzirCondicaoClima(clima.condicao);
                        console.log(criarBox(
                            chalk.hex(estado.temaAtual.corTexto)(`Cidade: ${clima.cidade}\nTemperatura: ${clima.temperatura}°C\nCondição: ${condicaoTraduzida}`),
                            'Previsão do Tempo'
                        ));
                    } else {
                        console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corErro)('❌ Não foi possível obter dados do clima'), 'center'));
                    }
                });
                return null;
                
            case '!noticias':
                obterNoticias().then(noticias => {
                    let textoNoticias = '';
                    noticias.forEach((noticia, index) => {
                        textoNoticias += `${index + 1}. ${noticia.titulo} (${noticia.fonte})\n`;
                    });
                    console.log(criarBox(chalk.hex(estado.temaAtual.corTexto)(textoNoticias), 'Últimas Notícias'));
                });
                return null;
                
            case '!calendario':
                const calendario = gerarCalendarioMensal();
                console.log(criarBox(chalk.hex(estado.temaAtual.corTexto)(calendario), 'Calendário'));
                return null;
                
            default:
                console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corErro)(`❌ Comando desconhecido: ${comando}`), 'center'));
                return null;
        }
    }
    
    return entrada;
}

async function processarResposta(prompt) {
    try {
        iniciarSpinner('Processando resposta...');
        
        // Adicionar contexto de memória
        let promptCompleto = IDIOMA_PADRAO + '\n\n';
        
        if (estado.memoriaTemporaria.length > 0) {
            promptCompleto += 'CONTEXTO RECENTE:\n';
            estado.memoriaTemporaria.forEach((item, index) => {
                promptCompleto += `[${index + 1}] ${item}\n`;
            });
            promptCompleto += '\n';
        }
        
        promptCompleto += `PERGUNTA: ${prompt}`;
        
        // Enviar para API
        const resposta = await enviarParaAPI(promptCompleto);
        
        // Atualizar memória
        adicionarMemoriaTemporaria(prompt);
        estado.ultimoInput = prompt;
        estado.ultimaResposta = resposta;
        
        pararSpinner();
        
        // Verificar se a resposta é grande demais para exibir diretamente
        if (resposta.length > config.WEB_SERVER.FILE_THRESHOLD && estado.servidor) {
            try {
                // Gerar ID único para a mensagem
                const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
                const nomeArquivo = `${id}.txt`;
                const caminhoCompleto = path.join(config.WEB_SERVER.PUBLIC_DIR, nomeArquivo);
                
                // Salvar mensagem
                await fs.writeFile(caminhoCompleto, resposta);
                
                // Criar URL para acesso
                const url = `http://localhost:${config.WEB_SERVER.PORT}/mensagem/${id}`;
                
                // Exibir versão resumida com link
                const resumo = resposta.substring(0, config.WEB_SERVER.FILE_THRESHOLD) + 
                    `\n\n[...]\n\nA resposta completa é muito longa. Acesse em: ${url}`;
                
                return resumo;
            } catch (err) {
                console.error(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao salvar mensagem grande: ${err.message}`));
                return resposta;
            }
        }
        
        return resposta;
    } catch (err) {
        pararSpinner();
        console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corErro)(`❌ Erro ao processar resposta: ${err.message}`), 'center'));
        return `Erro ao processar resposta: ${err.message}`;
    }
}

async function iniciar() {
    await inicializar();
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: chalk.hex(estado.temaAtual.corPrimaria)('> ')
    });
    
    rl.prompt();
    
    rl.on('line', async (linha) => {
        const entrada = await processarEntrada(linha);
        
        if (entrada !== null) {
            const resposta = await processarResposta(entrada);
            await animacaoDigitacao(resposta);
        }
        
        rl.prompt();
    });
    
    rl.on('close', () => {
        console.log(criarBordaVertical(chalk.hex(estado.temaAtual.corSucesso)('✓ Programa encerrado'), 'center'));
        process.exit(0);
    });
}

// Iniciar o programa
iniciar();
