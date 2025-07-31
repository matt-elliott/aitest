const express = require('express');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const chokidar = require('chokidar');
const moment = require('moment');

const app = express();
const PORT = 5500;

// Serve static files
app.use(express.static('public'));

// Log file paths
const LOG_PATHS = {
    system: '/var/log/custom/system.log',
    auth: '/var/log/custom/auth.log',
    combined: '/var/log/custom/combined.log',
    error: '/var/log/custom/error.log',
    access: '/var/log/custom/access.log'
};

// Create HTTP server
const server = require('http').createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('Client connected');
    clients.add(ws);
    
    // Send initial log data
    sendInitialLogs(ws);
    
    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });
});

// Function to parse log line
function parseLogLine(line) {
    // Parse rsyslog format: timestamp hostname facility.severity program[pid]: message
    const logRegex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:[+-]\d{2}:\d{2})?)\s+(\S+)\s+(\S+)\.(\S+)\s+([^[]+)(?:\[(\d+)\])?\s*:\s*(.*)$/;
    const match = line.match(logRegex);
    
    if (match) {
        return {
            timestamp: match[1],
            hostname: match[2],
            facility: match[3],
            severity: match[4],
            program: match[5],
            pid: match[6] || null,
            message: match[7],
            raw: line
        };
    }
    
    // Fallback for lines that don't match the expected format
    return {
        timestamp: new Date().toISOString(),
        hostname: 'unknown',
        facility: 'unknown',
        severity: 'info',
        program: 'unknown',
        pid: null,
        message: line,
        raw: line
    };
}

// Function to read log file and return parsed entries
async function readLogFile(filePath, maxLines = 1000) {
    try {
        if (!fs.existsSync(filePath)) {
            return [];
        }
        
        const data = fs.readFileSync(filePath, 'utf8');
        const lines = data.split('\n').filter(line => line.trim());
        
        // Get the last maxLines entries and reverse to show newest first
        const recentLines = lines.slice(-maxLines).reverse();
        
        return recentLines.map(line => parseLogLine(line));
    } catch (error) {
        console.error(`Error reading log file ${filePath}:`, error);
        return [];
    }
}

// Function to send initial logs to a client
async function sendInitialLogs(ws) {
    try {
        const logs = {};
        
        for (const [name, path] of Object.entries(LOG_PATHS)) {
            logs[name] = await readLogFile(path);
        }
        
        ws.send(JSON.stringify({
            type: 'initial',
            logs: logs
        }));
    } catch (error) {
        console.error('Error sending initial logs:', error);
    }
}

// Function to broadcast new log entries to all clients
function broadcastLogUpdate(logType, newEntries) {
    const message = JSON.stringify({
        type: 'update',
        logType: logType,
        entries: newEntries
    });
    
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Watch log files for changes
Object.entries(LOG_PATHS).forEach(([name, filePath]) => {
    let lastSize = 0;
    
    // Initialize file size
    if (fs.existsSync(filePath)) {
        lastSize = fs.statSync(filePath).size;
    }
    
    // Watch for file changes
    chokidar.watch(filePath, {
        ignoreInitial: true,
        usePolling: true,
        interval: 1000
    }).on('change', async () => {
        try {
            const stats = fs.statSync(filePath);
            
            if (stats.size > lastSize) {
                // File has grown, read new content
                const stream = fs.createReadStream(filePath, {
                    start: lastSize,
                    encoding: 'utf8'
                });
                
                let buffer = '';
                stream.on('data', chunk => {
                    buffer += chunk;
                });
                
                stream.on('end', () => {
                    const newLines = buffer.split('\n').filter(line => line.trim());
                    if (newLines.length > 0) {
                        const newEntries = newLines.map(line => parseLogLine(line));
                        broadcastLogUpdate(name, newEntries);
                    }
                });
                
                lastSize = stats.size;
            }
        } catch (error) {
            console.error(`Error watching ${filePath}:`, error);
        }
    });
});

// API endpoint to get logs
app.get('/api/logs/:logType', async (req, res) => {
    const { logType } = req.params;
    const { limit = 1000 } = req.query;
    
    if (!LOG_PATHS[logType]) {
        return res.status(404).json({ error: 'Log type not found' });
    }
    
    try {
        const logs = await readLogFile(LOG_PATHS[logType], parseInt(limit));
        res.json(logs);
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint to get all log types
app.get('/api/logs', async (req, res) => {
    try {
        const logs = {};
        
        for (const [name, path] of Object.entries(LOG_PATHS)) {
            logs[name] = await readLogFile(path, 100); // Limit to 100 entries for overview
        }
        
        res.json(logs);
    } catch (error) {
        console.error('Error fetching all logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        logPaths: LOG_PATHS
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`Log viewer server running on http://localhost:${PORT}`);
    console.log(`Monitoring log files:`, Object.values(LOG_PATHS));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    server.close(() => {
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    server.close(() => {
        process.exit(0);
    });
});