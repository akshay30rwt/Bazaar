const startConversation = async (req, res, next) => {
    try {
        const { vendorId, productId, initialMessage } = req.body;

        const vendor = await Vendor.findById(vendorId);

        if (!vendor) {
            throw new AppError('Vendor not found', 404);
        }

        if (!vendor.isActive) {
            throw new AppError('This vendor is currently unavailable', 400);
        }

        if (vendor.user.toString() === req.userId.toString()) {
            throw new AppError('You cannot start a conversation with your own storefront', 400);
        }

        let conversation = await Conversation.findOne({ buyer: req.userId, vendor: vendorId });

        if (!conversation) {
            try {
                conversation = new Conversation({
                    buyer: req.userId,
                    vendor: vendorId,
                    relatedProduct: productId || null
                });
                await conversation.save();
            } catch (saveError) {
                if (saveError.code === 11000) {
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

    } catch (err) {
        if (err.name === 'CastError') {
            return next(new AppError('Invalid ID format', 400));
        }
        next(err);
    }
};