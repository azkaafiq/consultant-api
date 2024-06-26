const db = require('../db');
const { dateTime } = require('../utils/timestamp');
const { generateErrorResponse, generateSuccessResponse } = require('../utils/response');
const logger = require('../utils/logger');

function getUserProfile(userId, callback) {
    db.query(
        `SELECT 
            p.userId,
            p.roleId,
            p.name,
            p.email,
            p.contact_no,
            p.address,
            p.city,
            p.state,
            p.country,
            p.profile_description,
            p.portfolio,
            p.website,
            p.taggedByAdmin,
            p.adminId,
            p.insert_datetime,
            w.WorkExperienceID AS workExperienceId,
            w.position AS workPosition,
            w.company AS workCompany,
            w.currentEmployer AS workCurrentEmployer,
            w.description AS workDescription,
            w.startDate AS workStartDate,
            w.endDate AS workEndDate,
            w.uploadDate,
            e.educationId,
            e.university,
            e.course,
            e.domain,
            e.startDate AS educationStartDate,
            e.endDate AS educationEndDate,
            a.documentID AS documentId,
            a.documentType,
            a.fileName,
            a.uploadDate
        FROM cons_profile p
        LEFT JOIN cons_workexperience w ON p.userId = w.userId
        LEFT JOIN cons_education e ON p.userId = e.userId
        LEFT JOIN cons_application a ON p.userId = a.userId
        WHERE p.userId = ?`,
        [userId],
        (error, results) => {
            if (error) {
                logger.error(`Error executing MySQL query: ${error.message}`);
                return callback(generateErrorResponse('Internal Server Error', 'Database query error'), null);
            }

            if (results.length === 0) {
                logger.warn(`User profile not found for userId: ${userId}`);
                return callback(generateErrorResponse('User not found'), null);
            }

            const userProfile = {
                userId: results[0].userId,
                roleId: results[0].roleId,
                name: results[0].name,
                email: results[0].email,
                contact_no: results[0].contact_no,
                address: results[0].address,
                city: results[0].city,
                state: results[0].state,
                country: results[0].country,
                profile_description: results[0].profile_description,
                portfolio: results[0].portfolio,
                website: results[0].website,
                taggedByAdmin: results[0].taggedByAdmin,
                adminId: results[0].adminId,
                insert_datetime: results[0].insert_datetime,
                workExperience: [],
                education: [],
                applications: []
            };

            // Populate work experiences
            results.forEach(row => {
                if (row.workExperienceId) {
                    // Check if workExperienceId already exists in userProfile.workExperience
                    const existingWorkExperienceIndex = userProfile.workExperience.findIndex(exp => exp.workExperienceId === row.workExperienceId);
                    if (existingWorkExperienceIndex !== -1) {
                        // Replace existing data with new data
                        userProfile.workExperience[existingWorkExperienceIndex] = {
                            workExperienceId: row.workExperienceId,
                            position: row.workPosition,
                            company: row.workCompany,
                            currentEmployer: row.workCurrentEmployer,
                            description: row.workDescription,
                            startDate: row.workStartDate,
                            endDate: row.workEndDate,
                            uploadDate: row.uploadDate
                        };
                    } else {
                        // Add new work experience data
                        userProfile.workExperience.push({
                            workExperienceId: row.workExperienceId,
                            position: row.workPosition,
                            company: row.workCompany,
                            currentEmployer: row.workCurrentEmployer,
                            description: row.workDescription,
                            startDate: row.workStartDate,
                            endDate: row.workEndDate,
                            uploadDate: row.uploadDate
                        });
                    }
                }
            });

            // Populate education details
            results.forEach(row => {
                if (row.educationId) {
                    // Check if educationId already exists in userProfile.education
                    const existingEducationIndex = userProfile.education.findIndex(edu => edu.educationId === row.educationId);
                    if (existingEducationIndex !== -1) {
                        // Replace existing data with new data
                        userProfile.education[existingEducationIndex] = {
                            educationId: row.educationId,
                            university: row.university,
                            course: row.course,
                            domain: row.domain,
                            startDate: row.educationStartDate,
                            endDate: row.educationEndDate
                        };
                    } else {
                        // Add new education data
                        userProfile.education.push({
                            educationId: row.educationId,
                            university: row.university,
                            course: row.course,
                            domain: row.domain,
                            startDate: row.educationStartDate,
                            endDate: row.educationEndDate
                        });
                    }
                }
            });

            // Populate applications
            results.forEach(row => {
                if (row.documentId) {
                    // Check if documentId already exists in userProfile.applications
                    const existingApplicationIndex = userProfile.applications.findIndex(app => app.documentId === row.documentId);
                    if (existingApplicationIndex !== -1) {
                        // Replace existing data with new data
                        userProfile.applications[existingApplicationIndex] = {
                            documentId: row.documentId,
                            documentType: row.documentType,
                            fileName: row.fileName,
                            uploadDate: row.uploadDate
                        };
                    } else {
                        // Add new application data
                        userProfile.applications.push({
                            documentId: row.documentId,
                            documentType: row.documentType,
                            fileName: row.fileName,
                            uploadDate: row.uploadDate
                        });
                    }
                }
            });

            const response = generateSuccessResponse({ result: [userProfile] });

            // Sort workExperience array by uploadDate in descending order
            userProfile.workExperience.sort((a, b) => {
                return b.workExperienceId - a.workExperienceId;
            });

            return callback(null, response);
        }
    );
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    let month = date.getMonth() + 1;
    month = month < 10 ? `0${month}` : month;
    let day = date.getDate();
    day = day < 10 ? `0${day}` : day;
    return `${year}-${month}-${day}`;
}

function updateUserProfile(userId, updatedProfile, callback) {
    if (typeof callback !== 'function') {
        console.error('Callback is not a function');
        // Return an error if callback is missing or not a function
        return;
    }

    db.beginTransaction((beginTransactionErr) => {
        if (beginTransactionErr) {
            logger.error(`Error beginning transaction: ${beginTransactionErr.message}`);
            return callback(generateErrorResponse('Internal Server Error'), null);
        }

        // Update profile details
        db.query(
            `UPDATE cons_profile
            SET
                name = ?,
                email = ?,
                contact_no = ?,
                address = ?,
                city = ?,
                state = ?,
                country = ?,
                profile_description = ?,
                portfolio = ?,
                website = ?
            WHERE userId = ?`,
            [
                updatedProfile.name,
                updatedProfile.email,
                updatedProfile.contact_no,
                updatedProfile.address,
                updatedProfile.city,
                updatedProfile.state,
                updatedProfile.country,
                updatedProfile.profile_description,
                updatedProfile.portfolio,
                updatedProfile.website,
                userId
            ],
            (profileUpdateErr, profileUpdateResults) => {
                if (profileUpdateErr) {
                    logger.error(`Error updating profile: ${profileUpdateErr.message}`);
                    return db.rollback(() => {
                        callback(generateErrorResponse('Internal Server Error'), null);
                    });
                }
                logger.info(`Profile updated successfully for userId: ${userId}`);

                // Update work experience
                db.query(
                    `UPDATE cons_workexperience
                    SET
                        position = ?,
                        company = ?,
                        currentEmployer = ?,
                        description = ?,
                        startDate = ?,
                        endDate = ?
                    WHERE userId = ? and workExperienceId = ?`,
                    [
                        updatedProfile.workExperience.position,
                        updatedProfile.workExperience.company,
                        updatedProfile.workExperience.currentEmployer,
                        updatedProfile.workExperience.description,
                        formatDate(updatedProfile.workExperience.startDate),
                        formatDate(updatedProfile.workExperience.endDate),
                        updatedProfile.workExperience.workExperienceId,
                        userId
                    ],
                    (workExperienceUpdateErr, workExperienceUpdateResults) => {
                        if (workExperienceUpdateErr) {
                            logger.error(`Error updating work experience: ${workExperienceUpdateErr.message}`);
                            return db.rollback(() => {
                                callback(generateErrorResponse('Internal Server Error'), null);
                            });
                        }
                        logger.info('Work experience updated successfully');

                        // Update education
                        db.query(
                            `UPDATE cons_education
                            SET
                                university = ?,
                                course = ?,
                                domain = ?,
                                startDate = ?,
                                endDate = ?
                            WHERE userId = ? and educationId = ?`,
                            [
                                updatedProfile.education[0].university,
                                updatedProfile.education[0].course,
                                updatedProfile.education[0].domain,
                                formatDate(updatedProfile.education[0].startDate),
                                formatDate(updatedProfile.education[0].endDate),
                                userId,
                                updatedProfile.education[0].educationId
                            ],
                            (educationUpdateErr, educationUpdateResults) => {
                                if (educationUpdateErr) {
                                    logger.error(`Error updating education: ${educationUpdateErr.message}`);
                                    return db.rollback(() => {
                                        callback(generateErrorResponse('Internal Server Error'), null);
                                    });
                                }
                                logger.info('Education updated successfully');

                                // Update applications
                                db.query(
                                    `UPDATE cons_application
                                    SET
                                        documentType = ?,
                                        fileName = ?,
                                        fileData = ?,
                                        uploadDate = ?
                                    WHERE userId = ? and documentID = ?`,
                                    [
                                        updatedProfile.applications.documentType,
                                        updatedProfile.applications.fileName,
                                        updatedProfile.applications.fileData,
                                        updatedProfile.applications.uploadDate,
                                        updatedProfile.applications.documentID,
                                        userId
                                    ],
                                    (applicationsUpdateErr, applicationsUpdateResults) => {
                                        if (applicationsUpdateErr) {
                                            logger.error(`Error updating applications: ${applicationsUpdateErr.message}`);
                                            return db.rollback(() => {
                                                callback(generateErrorResponse('Internal Server Error'), null);
                                            });
                                        }
                                        logger.info('Applications updated successfully');

                                        // Construct success response
                                        const response = generateSuccessResponse({ message: 'Profile updated successfully' });

                                        // Commit the transaction
                                        db.commit((commitErr) => {
                                            if (commitErr) {
                                                logger.error(`Error committing transaction: ${commitErr.message}`);
                                                return db.rollback(() => {
                                                    callback(generateErrorResponse('Internal Server Error'), null);
                                                });
                                            }
                                            logger.info('Transaction committed successfully');
                                            // Callback with success response
                                            return callback(null, response);
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });
}

module.exports = { getUserProfile, updateUserProfile };

