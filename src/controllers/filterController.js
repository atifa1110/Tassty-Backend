import { FilterModel } from '../models/filterModel.js'
import ResponseHandler from '../utils/responseHandler.js'

export const FilterController = {
    getFilterMetadata: async (req, res) => {
        try {
            const data = await FilterModel.getAllFilterMetadata(); 

            return ResponseHandler.success(res, 200, 'Filter metadata retrieved successfully', data);
        } catch (err) {
            return ResponseHandler.error(res, 500, 'Failed to fetch metadata: ' + err.message);
        }
    }
}