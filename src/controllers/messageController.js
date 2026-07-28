const startConversation = async (req, res, next) => {
    try {
        const { vendorId, productId, initialMessage } = req.body;

        const vendor = await Vendor.findById(vendorId);

        if(!vendor) {
            throw new AppError('Vendor not found', 404);
        }

        if(!vendor.isActive) {
            throw new AppError('This vendor is currently unavailable', 400);
        }

        if(vendor.user.toString() === req.userId.toString()) {
            throw new AppError('You cannot start a conversation with your own storefront', 400);
        }

        let conversation = await Conversation.findOne({ buyer: req.userId, vendor: vendorId });

        if(!conversation) {
            try {
                conversation = new Conversation({
                    buyer: req.userId,
                    vendor: vendorId,
                    relatedProduct: productId || null
                });
                await conversation.save();
            } 
            catch(saveError) {
                if(saveError.code === 11000) {
                    conversation = await Conversation.findOne({ buyer: req.userId, vendor: vendorId });
                } else {
                    throw saveError;
                }
            }
        }

        const message = new Message({
            conversation: conversation._id,
            sender: req.userId,
            content: initialMessage
        });
        await message.save();

        conversation = await Conversation.findByIdAndUpdate(
            conversation._id,
            {
                lastMessage: initialMessage,
                lastMessageAt: new Date(),
                $inc: { unreadCountVendor: 1 }
            },
            { new: true }
        );

        res.status(201).json({
            message: 'Conversation started successfully',
            conversation,
            firstMessage: message
        });
    } 
    catch(error) {
        if(error.name === 'CastError') {
            return next(new AppError('Invalid ID format', 400));
        }
        next(error);
    }
};

const getInbox = async (req, res, next) => {
    try {
        const vendorProfile = await Vendor.findOne({ user: req.userId });

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const filter = vendorProfile
            ? { $or: [{ buyer: req.userId }, { vendor: vendorProfile._id }] }
            : { buyer: req.userId };

        const [conversations, total] = await Promise.all([
            Conversation.find(filter)
                .populate('buyer', 'name avatar isOnline')
                .populate('vendor', 'storeName banner')
                .populate('relatedProduct', 'name images')
                .sort({ lastMessageAt: -1 })
                .skip(skip)
                .limit(limit),
            Conversation.countDocuments(filter)
        ]);

        res.status(200).json({
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: conversations
        });
    } 
    catch(error) {
        next(error);
    }
};

const getConversationMessages = async (req, res, next) => {
    try {
        const { conversationId } = req.params;

        const conversation = await Conversation.findById(conversationId);

        if(!conversation) {
            throw new AppError('Conversation not found', 404);
        }

        const vendorProfile = await Vendor.findOne({ user: req.userId });

        const isBuyer = conversation.buyer.toString() === req.userId.toString();
        const isVendor = vendorProfile && conversation.vendor.toString() === vendorProfile._id.toString();

        if(!isBuyer && !isVendor) {
            throw new AppError('You do not have permission to view this conversation', 403);
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
        const skip = (page - 1) * limit;

        const [messages, total] = await Promise.all([
            Message.find({ conversation: conversationId })
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(limit),
            Message.countDocuments({ conversation: conversationId })
        ]);

        const unreadField = isBuyer ? 'unreadCountBuyer' : 'unreadCountVendor';
        await Conversation.findByIdAndUpdate(conversationId, { [unreadField]: 0 });

        await Message.updateMany(
            { conversation: conversationId, sender: { $ne: req.userId }, isRead: false },
            { isRead: true }
        );

        res.status(200).json({
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: messages
        });
    } 
    catch(error) {
        if(error.name === 'CastError') {
            return next(new AppError('Invalid conversation ID format', 400));
        }
        next(error);
    }
};

module.exports = { startConversation, getInbox, getConversationMessages };