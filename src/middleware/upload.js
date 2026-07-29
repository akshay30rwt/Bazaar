const multer = require('multer');
const AppError = require('../utils/AppError');
const { MAX_FILE_SIZE_MB, MAX_FILES_PER_UPLOAD } = require('../config/constants');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if(allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('Only JPEG, PNG and WEBP images are allowed', 400), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
        files: MAX_FILES_PER_UPLOAD
    }
});

module.exports = {
    single: upload.single.bind(upload),
    multiple: upload.array.bind(upload)
};