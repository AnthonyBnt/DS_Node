const fs = require('fs');
const path = require('path');
const eventBus = require('./eventBus');

const logFilePath = path.join(__dirname, 'data', 'logs.txt');
fs.mkdirSync(path.dirname(logFilePath), { recursive: true });

function writeLog(message) {
    const now = new Date().toISOString();
    const logLine = `[${now}] ${message}\n`;
    fs.appendFile(logFilePath, logLine, (err) => {
        if (err) {
            console.error('Erreur écriture log:', err);
        }
    });
}

// ICI : écoute d’un événement personnalisé ↓
eventBus.on('custom:message', (message) => {
    console.log('LOG EVENT:', message);
    writeLog(`custom:message - ${message}`);
});

eventBus.on('server:start', ({ port }) => {
    console.log(`LOG EVENT: server:start (port ${port})`);
    writeLog(`server:start - port ${port}`);
});

eventBus.on('auth:attempt', ({ email, ip }) => {
    writeLog(`auth:attempt - ${email} - ${ip}`);
});

eventBus.on('auth:success', ({ email, ip }) => {
    writeLog(`auth:success - ${email} - ${ip}`);
});

eventBus.on('auth:failure', ({ email, ip }) => {
    writeLog(`auth:failure - ${email} - ${ip}`);
});

eventBus.on('auth:locked', ({ email, ip }) => {
    writeLog(`auth:locked - ${email} - ${ip}`);
});

eventBus.on('session:create', ({ email, ip }) => {
    writeLog(`session:create - ${email} - ${ip}`);
});

eventBus.on('session:invalid', ({ ip }) => {
    writeLog(`session:invalid - ${ip}`);
});

eventBus.on('action:triggered', ({ action, email, ip }) => {
    writeLog(`action:triggered - action ${action} - ${email} - ${ip}`);
});
