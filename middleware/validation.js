const { body, validationResult } = require('express-validator');

// Request validation middleware
const validateRequest = [
    body('param1').isString().withMessage('Param1 must be a string'),
    body('param2').isInt().withMessage('Param2 must be an integer'),
    // Add more validation rules as needed
];

const checkValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

module.exports = { validateRequest, checkValidation };