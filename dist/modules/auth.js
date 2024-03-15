"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = exports.createJWTWithExpiration = exports.createJWT = exports.hashPassword = exports.comparePasswords = void 0;
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var bcrypt_1 = __importDefault(require("bcrypt"));
// Function that uses bcrypt to compare a password string with a hash
var comparePasswords = function (password, hash) {
    return bcrypt_1.default.compare(password, hash);
};
exports.comparePasswords = comparePasswords;
// Function that created a hased password from a password string.
// The "5" is a salt. this gives different variety of the output (makes the combination harder to guess.)
var hashPassword = function (password) {
    return bcrypt_1.default.hash(password, 5);
};
exports.hashPassword = hashPassword;
// Create a jason web token.
var createJWT = function (user) {
    var token = jsonwebtoken_1.default.sign({
        id: user.id,
        username: user.username
    }, process.env.JWT_SECRET);
    return token;
};
exports.createJWT = createJWT;
// Create a jason web token with an expiration date.
var createJWTWithExpiration = function (user) {
    var token = jsonwebtoken_1.default.sign({
        id: user.id
    }, process.env.JWT_PW_RESET, {
        expiresIn: '12h'
    });
    return token;
};
exports.createJWTWithExpiration = createJWTWithExpiration;
// The protect function that sits before each request.
var protect = function (req, res, next) {
    // Get the bearer token from the request header
    var bearer = req.headers.authorization;
    // If there is no bearer token. You get a 401 not authorized status.
    if (!bearer) {
        res.status(401);
        res.send('not authorized');
        return;
    }
    // grab the token off the bearer to see if there's an actual token.
    // This checks purely on formatting of the token.
    var _a = bearer.split(' '), token = _a[1];
    if (!token) {
        res.status(401);
        res.send('no valid token');
        return;
    }
    // lastly check on actual security code.
    // Use try catch in case something goes wrong. We don't want the server to break because someone messed up.
    try {
        var payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // user is set in the createJWT() function above.
        req.user = payload;
        next();
        return;
    }
    catch (e) {
        console.error(e);
        res.status(401);
        res.send("no valid token");
        return;
    }
};
exports.protect = protect;
//# sourceMappingURL=auth.js.map