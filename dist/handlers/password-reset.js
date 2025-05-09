"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePassword = exports.passwordResetRequest = void 0;
var nodemailer_1 = __importDefault(require("nodemailer"));
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var db_1 = __importDefault(require("../db"));
var auth_1 = require("../modules/auth");
/**
 * Handles the password reset request.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next middleware function.
 */
var passwordResetRequest = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var user, token, frontendUrl, subject, resetLink, transporter, error_1, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                return [4 /*yield*/, db_1.default.user.findUnique({
                        where: {
                            email: req.body.email
                        }
                    })];
            case 1:
                user = _a.sent();
                if (!user) {
                    res.status(401);
                    res.json({ message: "No user with that email." });
                    return [2 /*return*/];
                }
                token = (0, auth_1.createJWTWithExpiration)(user);
                frontendUrl = process.env.FRONTEND_URL;
                console.log('frontendUrl', frontendUrl);
                subject = 'Password reset link';
                resetLink = "".concat(frontendUrl, "/reset-password/").concat(user.id, "?token=").concat(token);
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                transporter = nodemailer_1.default.createTransport({
                    service: process.env.SERVICE,
                    auth: {
                        user: process.env.MAIL,
                        pass: process.env.PASS,
                    },
                });
                return [4 /*yield*/, transporter.sendMail({
                        from: process.env.MAIL,
                        to: req.body.email,
                        subject: subject,
                        html: "".concat('click the following link to reset password:', " <a href=\"").concat(resetLink, "\"> Reset password</a>"),
                    }, function (error, info) {
                        if (error) {
                            console.log(error);
                        }
                        console.log("Message sent: ".concat(info.response));
                    })];
            case 3:
                _a.sent();
                console.log("email sent sucessfully");
                return [3 /*break*/, 5];
            case 4:
                error_1 = _a.sent();
                console.log(error_1, "email not sent");
                return [3 /*break*/, 5];
            case 5:
                res.json({ message: "email send" });
                return [3 /*break*/, 7];
            case 6:
                e_1 = _a.sent();
                e_1.type = 'next';
                next(e_1);
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.passwordResetRequest = passwordResetRequest;
/**
 * Updates the password for a user.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next function.
 * @returns {Promise<void>} - A promise that resolves when the password is updated.
 */
var updatePassword = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var user, payload, hash, e_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                return [4 /*yield*/, db_1.default.user.findUnique({
                        where: {
                            id: req.params.id
                        }
                    })];
            case 1:
                user = _a.sent();
                if (!user) {
                    res.status(401);
                    res.json({ message: "Invalid user" });
                    return [2 /*return*/];
                }
                payload = jsonwebtoken_1.default.verify(req.query.token, process.env.JWT_PW_RESET);
                return [4 /*yield*/, (0, auth_1.hashPassword)(req.body.password)
                    // Update the user with the new password
                ];
            case 2:
                hash = _a.sent();
                // Update the user with the new password
                return [4 /*yield*/, db_1.default.user.update({
                        where: {
                            id: req.params.id
                        },
                        data: {
                            password: hash
                        }
                    })
                    // Send the new password to the user.
                ];
            case 3:
                // Update the user with the new password
                _a.sent();
                // Send the new password to the user.
                res.json({ message: "password succesfully updated" });
                return [3 /*break*/, 5];
            case 4:
                e_2 = _a.sent();
                e_2.type = 'next';
                next(e_2);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.updatePassword = updatePassword;
//# sourceMappingURL=password-reset.js.map