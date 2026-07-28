const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const logger = require('../utils/logger');

const onlineUsers = new Map();

const initSocket = (io) => {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if(!token) {
                return next(new Error('No token provided'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);

            if(!user) {
                return next(new Error('User no longer exists'));
            }

            socket.userId = user._id.toString();
            socket.userRole = user.role;
            next();
        } 
        catch(error) {
            if(error.name === 'TokenExpiredError') {
                return next(new Error('Session expired'));
            }
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', async (socket) => {
        onlineUsers.set(socket.userId, socket.id);

        await User.findByIdAndUpdate(socket.userId, { isOnline: true });

        const vendorProfile = await Vendor.findOne({ user: socket.userId });
        if(vendorProfile) {
            io.emit('vendorStatusChanged', { vendorId: vendorProfile._id, isOnline: true });
        }

        socket.on('disconnect', async () => {
            onlineUsers.delete(socket.userId);
            await User.findByIdAndUpdate(socket.userId, { isOnline: false });

            if(vendorProfile) {
                io.emit('vendorStatusChanged', { vendorId: vendorProfile._id, isOnline: false });
            }
        });

        socket.on('sendMessage', async ({ conversationId, content }) => {
            try {
                if(!content || content.trim().length === 0) {
                    socket.emit('messageError', { message: 'Message cannot be empty' });
                    return;
                }

                if(content.length > 2000) {
                    socket.emit('messageError', { message: 'Message is too long' });
                    return;
                }

                const conversation = await Conversation.findById(conversationId);

                if(!conversation) {
                    socket.emit('messageError', { message: 'Conversation not found' });
                    return;
                }

                const vendorProfile = await Vendor.findOne({ user: socket.userId });
                const isBuyer = conversation.buyer.toString() === socket.userId;
                const isVendor = vendorProfile && conversation.vendor.toString() === vendorProfile._id.toString();

                if(!isBuyer && !isVendor) {
                    socket.emit('messageError', { message: 'You are not a participant in this conversation' });
                    return;
                }

                const message = new Message({
                    conversation: conversationId,
                    sender: socket.userId,
                    content: content.trim()
                });
                await message.save();

                const unreadFieldToIncrement = isBuyer ? 'unreadCountVendor' : 'unreadCountBuyer';

                const updatedConversation = await Conversation.findByIdAndUpdate(
                    conversationId,
                    {
                        lastMessage: content.trim(),
                        lastMessageAt: new Date(),
                        $inc: { [unreadFieldToIncrement]: 1 }
                    },
                    { new: true }
                );

                const recipientUserId = isBuyer
                    ? (await Vendor.findById(conversation.vendor)).user.toString()
                    : conversation.buyer.toString();

                const recipientSocketId = onlineUsers.get(recipientUserId);

                const payload = {
                    conversationId,
                    senderId: socket.userId,
                    content: message.content,
                    createdAt: message.createdAt
                };

                socket.emit('receiveMessage', payload);

                if(recipientSocketId) {
                    io.to(recipientSocketId).emit('receiveMessage', payload);
                }
            } 
            catch(error) {
                logger.error(`Socket sendMessage error: ${error.message}`);
                socket.emit('messageError', { message: 'Failed to send message' });
            }
        });

        socket.on('typing', async ({ conversationId }) => {
            try {
                const conversation = await Conversation.findById(conversationId);
                if(!conversation) return;

                const vendorProfile = await Vendor.findOne({ user: socket.userId });
                const isBuyer = conversation.buyer.toString() === socket.userId;

                const recipientUserId = isBuyer
                    ? (await Vendor.findById(conversation.vendor)).user.toString()
                    : conversation.buyer.toString();

                const recipientSocketId = onlineUsers.get(recipientUserId);
                if(recipientSocketId) {
                    io.to(recipientSocketId).emit('userTyping', { conversationId, userId: socket.userId });
                }
            } 
            catch(error) {
                logger.error(`Socket typing error: ${error.message}`);
            }
        });

        socket.on('stopTyping', async ({ conversationId }) => {
            try {
                const conversation = await Conversation.findById(conversationId);
                if(!conversation) return;

                const isBuyer = conversation.buyer.toString() === socket.userId;

                const recipientUserId = isBuyer
                    ? (await Vendor.findById(conversation.vendor)).user.toString()
                    : conversation.buyer.toString();

                const recipientSocketId = onlineUsers.get(recipientUserId);
                if(recipientSocketId) {
                    io.to(recipientSocketId).emit('userStoppedTyping', { conversationId, userId: socket.userId });
                }
            } 
            catch(error) {
                logger.error(`Socket stopTyping error: ${error.message}`);
            }
        });
    });
};

module.exports = initSocket;