const http = require('http');
const eventBus = require('./eventBus');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');


const PORT = Number(process.env.PORT) || 3000;
const loginFailure = new Map();
const lockedUsers = new Set();
const actionCounts = {A: 0, B: 0, C: 0, D: 0};
const sessions = new Map();

function serveFile(res, filePath, contentType = 'text/html') {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Erreur serveur');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

function redirect(res, location) {
    res.writeHead(302, { Location: location });
    res.end();
}

function navigationHtml(sessionId = null) {
    const sessionQuery = sessionId ? `?session=${encodeURIComponent(sessionId)}` : '';
    return `<nav aria-label="Navigation principale">
        <a href="/">Accueil</a> |
        <a href="/login">Login</a> |
        <a href="/dashboard${sessionQuery}">Dashboard</a> |
        <a href="/logs${sessionQuery}">Logs</a> |
        <a href="/stats${sessionQuery}">Statistiques</a>
    </nav><hr>`;
}

function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function loadUsers() {
    const usersPath = path.join(__dirname, 'config', 'users.json');
    const fileContent = fs.readFileSync(usersPath, 'utf-8');
    return JSON.parse(fileContent);
}

function isValidLogin(email, password, users) {
    return users.some((u) => u.email === email && u.password === password);
}

function requireSession(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const sessionId = url.searchParams.get('session');

    if (!sessionId || !sessions.has(sessionId)) {
        eventBus.emit('session:invalid', { ip: req.socket.remoteAddress });
        redirect(res, '/login?error=session');
        return null;
    }

    return sessionId;
}

const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
    // Ce code est exécuté à CHAQUE requête HTTP
    console.log('Nouvelle requête reçue');
    console.log('URL:', req.url);
    console.log('Méthode:', req.method);
    if (req.method === 'GET' && pathname === '/login') {
        const filePath = path.join(__dirname, 'public', 'login.html');
        serveFile(res, filePath);
        return;
    }
    if (req.method === 'GET' && pathname === '/dashboard') {
        const sessionId = requireSession(req, res);
        if (!sessionId) return;
        const filePath = path.join(__dirname, 'public', 'dashboard.html');
        serveFile(res, filePath);
        return;
    }
    if (req.method === 'POST' && pathname === '/login') {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('error', (err) => {
            // Événement custom pour signaler une erreur technique
            eventBus.emit('request:error', { message: err.message });
            // Réponse HTTP côté client
            if (!res.headersSent && !res.writableEnded) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Erreur lors de la réception des données');
            }
        });

        req.on('end', () => {
            const params = new URLSearchParams(body);
            const email = params.get('email');
            const password = params.get('password');
            const ip = req.socket.remoteAddress;
            const users = loadUsers();

            eventBus.emit('auth:attempt', { email, ip });

            if (lockedUsers.has(email)) {
                eventBus.emit('auth:locked', { email, ip });
                redirect(res, '/login?error=locked');
            } else if (isValidLogin(email, password, users)) {
                loginFailure.delete(email);
                eventBus.emit('auth:success', { email, ip });
                const sessionId = crypto.randomUUID();
                sessions.set(sessionId, { email, createdAt: new Date().toISOString() });
                eventBus.emit('session:create', { email, ip });
                redirect(res, `/dashboard?session=${encodeURIComponent(sessionId)}`);
            } else {
                let failures = (loginFailure.get(email) || 0) + 1;
                loginFailure.set(email, failures)
                eventBus.emit('auth:failure', { email, ip });
                if (failures >= 3) {
                    lockedUsers.add(email)
                    eventBus.emit('auth:locked', { email, ip });
                    redirect(res, '/login?error=locked');
                } else {
                    redirect(res, '/login?error=1');
                }

            }
        });
        return;
    }
    if (req.method === 'GET' && pathname === '/action/a') {
        const sessionId = requireSession(req, res);
        if (!sessionId) return;
        const ip = req.socket.remoteAddress;
        const email = sessions.get(sessionId).email;
        actionCounts.A = actionCounts.A + 1;

        eventBus.emit('action:triggered', {
            action: 'A',
            email,
            ip
        });
        redirect(res, `/dashboard?session=${encodeURIComponent(sessionId)}`);
        return;
    }
    if (req.method === 'GET' && pathname === '/action/b') {
        const sessionId = requireSession(req, res);
        if (!sessionId) return;
        const ip = req.socket.remoteAddress;
        const email = sessions.get(sessionId).email;
        actionCounts.B = actionCounts.B + 1;

        eventBus.emit('action:triggered', {
            action: 'B',
            email,
            ip
        });
        redirect(res, `/dashboard?session=${encodeURIComponent(sessionId)}`);
        return;
    }
    if (req.method === 'GET' && pathname === '/action/c') {
        const sessionId = requireSession(req, res);
        if (!sessionId) return;
        const ip = req.socket.remoteAddress;
        const email = sessions.get(sessionId).email;
        actionCounts.C = actionCounts.C + 1;

        eventBus.emit('action:triggered', {
            action: 'C',
            email,
            ip
        });
        redirect(res, `/dashboard?session=${encodeURIComponent(sessionId)}`);
        return;
    }
    if (req.method === 'GET' && pathname === '/action/d') {
        const sessionId = requireSession(req, res);
        if (!sessionId) return;
        const ip = req.socket.remoteAddress;
        const email = sessions.get(sessionId).email;
        actionCounts.D = actionCounts.D + 1;

        eventBus.emit('action:triggered', {
            action: 'D',
            email,
            ip
        });
        redirect(res, `/dashboard?session=${encodeURIComponent(sessionId)}`);
        return;
    }
    if (req.method === 'GET' && pathname === '/stats') {
        const sessionId = requireSession(req, res);
        if (!sessionId) return;
        const totalActions = Object.values(actionCounts).reduce((total, count) => total + count, 0);
        const repartition = Object.entries(actionCounts).map(([action, count]) => `Action ${action} : ${count}`).join('\n');

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!doctype html><html lang="fr"><meta charset="utf-8"><title>Statistiques</title><body>${navigationHtml(sessionId)}<h1>Statistiques</h1><p>Total des actions : ${totalActions}</p><pre>${repartition}</pre></body></html>`);
        return;
    }
    if (req.method === 'GET' && pathname === '/logs') {

        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const sessionId = url.searchParams.get('session');
        let email = url.searchParams.get('email');

        if (sessionId) {
            if (!sessions.has(sessionId)) {
                eventBus.emit('session:invalid', { ip: req.socket.remoteAddress });
                redirect(res, '/login?error=session');
                return;
            }
            email = sessions.get(sessionId).email;
        }

        if (!email) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<!doctype html><html lang="fr"><meta charset="utf-8"><title>Logs</title><body>${navigationHtml()}<h1>Historique utilisateur</h1><form method="GET" action="/logs"><label for="email">Email :</label> <input id="email" name="email" type="email" required><button type="submit">Afficher les logs</button></form></body></html>`);
            return;
        }
        const logPath = path.join(__dirname, 'data', 'logs.txt');

        fs.readFile(logPath, 'utf-8', (err, content) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Impossible de lire le fichier de logs');
                return;
            }

            const lignes = content.split(/\r?\n/);
            const historique = lignes.filter((ligne) => ligne.includes(email));

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<!doctype html><html lang="fr"><meta charset="utf-8"><title>Logs utilisateur</title><body>${navigationHtml(sessionId)}<h1>Historique de ${escapeHtml(email)}</h1><pre>${escapeHtml(historique.join('\n'))}</pre></body></html>`);
        });
        return;
    }
    if (pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!doctype html><html lang="fr"><meta charset="utf-8"><title>Accueil</title><body>${navigationHtml()}<h1>Accueil</h1><p>Bienvenue dans l’application Node Events.</p></body></html>`);
    } else if (pathname === '/about') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>À propos</h1>');
    } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>Page non trouvée</h1>');
    }
});

server.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    // Le serveur démarre… c’est aussi un événement !
    eventBus.emit('server:start', { port: PORT });
});

module.exports = server;
