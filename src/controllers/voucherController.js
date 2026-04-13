import { VoucherModel } from '../models/voucherModel.js'
import ResponseHandler from '../utils/responseHandler.js'

export const VoucherController = {
    getVoucherToday: async (req, res) => {
        try {
            const userId = req.userId;
            const vouchers = await VoucherModel.getUserVoucher(userId);
            const todayVouchers = vouchers.filter(v => 
            v.status === 'AVAILABLE' && 
            new Date(v.start_date) <= new Date()
        );
            return ResponseHandler.success(res, 200, 'Get Vouchers Success', todayVouchers);
        } catch (err) {
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    },
    getVoucherRestaurant: async (req, res) => {
        try {
            const { restId } = req.params
            const vouchers = await VoucherModel.getVoucherRestaurant(restId);
            return ResponseHandler.success(res, 200, 'Get Vouchers Success', vouchers);
        } catch (err) {
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    },
    getVoucherUser: async (req, res) => {
        try {
            const userId = req.userId;
            const vouchers = await VoucherModel.getUserVoucher(userId);
            return ResponseHandler.success(res, 200, 'Get Vouchers Success', vouchers);
        } catch (err) {
            return ResponseHandler.error(res, 500, 'Internal Server Error: ' + err.message);
        }
    }
}