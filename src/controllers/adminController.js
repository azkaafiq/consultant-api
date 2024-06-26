// get user list
const logger = require('../utils/logger');
const adminService = require('../services/adminService');

function getUserListByAdmin(req, res) {
    adminService.getUserListByAdmin((error, results) => {
        if (error) {
            logger.error(`Error retrieving user list: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json(results);
    });
}

module.exports = { getUserListByAdmin };
