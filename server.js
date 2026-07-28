require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const initSocket = require('./src/sockets/chatSocket');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: '*' }
});

initSocket(io);

let httpServer;

connectDB().then(() => {
    httpServer = server.listen(PORT, () => {
        logger.info(`Server running on port: ${PORT}`);
    });
});

process.on('unhandledRejection', (err) => {
    logger.error(`UNHANDLED REJECTION: ${err.message}`);
    if(httpServer) {
        httpServer.close(() => process.exit(1));
    } else {
        process.exit(1);
    }
});

process.on('uncaughtException', (err) => {
    logger.error(`UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}`);
    process.exit(1);
});