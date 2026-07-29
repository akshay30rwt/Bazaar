const isVendorOnOrder = (order, vendorId) => {
    return order.items.some(
        item => item.vendor.toString() === vendorId.toString()
    );
};

const filterOrderItemsForVendor = (order, vendorId) => {
    const orderObj = order.toObject ? order.toObject() : order;
    orderObj.items = orderObj.items.filter(
        item => item.vendor.toString() === vendorId.toString()
    );
    return orderObj;
};

module.exports = { isVendorOnOrder, filterOrderItemsForVendor };