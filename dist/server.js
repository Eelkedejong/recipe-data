"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var router_1 = __importDefault(require("./routers/router"));
var public_1 = __importDefault(require("./routers/public"));
var cors_1 = __importDefault(require("cors"));
var morgan_1 = __importDefault(require("morgan"));
var auth_1 = require("./modules/auth");
var limiter_1 = require("./modules/limiter");
var user_1 = require("./handlers/user");
var password_reset_1 = require("./handlers/password-reset");
var app = (0, express_1.default)();
// Enable cors
app.use((0, cors_1.default)());
// Use Morgan for logging
app.use((0, morgan_1.default)('dev'));
// Use express.json so users can send json from the client.
app.use(express_1.default.json());
// Use urlencoded for url param encoding and decoding.
app.use(express_1.default.urlencoded({ extended: true }));
// Add Rate limiter
app.use(limiter_1.limiter);
// Todo: remove/rewrite this (for testing only)
app.get("/", function (req, res) {
    res.status(200);
    res.json({ message: 'hello' });
});
// This adds a default path to the api paths. 
// Protect is the authentication function before accessing the router.
app.use('/api', auth_1.protect, router_1.default);
// This adds a default path to the public api paths.
app.use('/public', public_1.default);
// This sets this handler including the path for how to call them for a post request to create new users and sign in.
// Unlike above router, these are not protected (as the user has no token yet)
app.post('/user', user_1.createNewUser);
app.post('/signin', user_1.signIn);
app.post('/forgot-password', password_reset_1.passwordResetRequest);
app.post('/password-reset/:id', password_reset_1.updatePassword);
exports.default = app;
//# sourceMappingURL=server.js.map