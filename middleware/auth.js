const jwt = require('jsonwebtoken');

// Middleware to authenticate the user using JWT
const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1]; // Get the token from the header

    if (!token) {
        return res.sendStatus(401); // Unauthorized
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Forbidden
        }
        req.user = user; // Save the user information in request object
        next(); // Call the next middleware or route handler
    });
};

module.exports = authenticateJWT;
