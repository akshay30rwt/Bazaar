const { isVendorOnOrder, filterOrderItemsForVendor } = require('../../src/utils/orderHelpers');

describe('orderHelpers', () => {
    const vendorAId = '507f1f77bcf86cd799439011';
    const vendorBId = '507f1f77bcf86cd799439012';

    const mockOrder = {
        items: [
            { vendor: vendorAId, name: 'Product A', quantity: 2 },
            { vendor: vendorBId, name: 'Product B', quantity: 1 }
        ]
    };

    describe('isVendorOnOrder', () => {
        it('should return true when vendor has an item in the order', () => {
            expect(isVendorOnOrder(mockOrder, vendorAId)).toBe(true);
        });

        it('should return false when vendor has no item in the order', () => {
            const unrelatedVendorId = '507f1f77bcf86cd799439099';
            expect(isVendorOnOrder(mockOrder, unrelatedVendorId)).toBe(false);
        });
    });

    describe('filterOrderItemsForVendor', () => {
        it('should return only the items belonging to the specified vendor', () => {
            const result = filterOrderItemsForVendor(mockOrder, vendorAId);

            expect(result.items).toHaveLength(1);
            expect(result.items[0].name).toBe('Product A');
        });

        it('should not include the other vendor\'s items', () => {
            const result = filterOrderItemsForVendor(mockOrder, vendorAId);

            const hasVendorBItem = result.items.some(item => item.vendor === vendorBId);
            expect(hasVendorBItem).toBe(false);
        });
    });
});