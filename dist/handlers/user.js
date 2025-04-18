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
exports.signIn = exports.createNewUser = void 0;
var db_1 = __importDefault(require("../db"));
var auth_1 = require("../modules/auth");
/**
 * Creates a new user with the provided username, email, and password.
 *
 * @param req - The request object containing the user data.
 * @param res - The response object used to send the server response.
 * @param next - The next function used to pass the error to the error handling middleware.
 * @returns A JSON response containing a JWT token and the username of the created user.
 * @throws If there is an error during the user creation process.
 */
var createNewUser = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var hash, userExists, emailExists, emailFormat, user, token, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                return [4 /*yield*/, (0, auth_1.hashPassword)(req.body.password)
                    // Check if there is a user with the same username
                ];
            case 1:
                hash = _a.sent();
                return [4 /*yield*/, db_1.default.user.findUnique({
                        where: {
                            username: req.body.username
                        }
                    })];
            case 2:
                userExists = _a.sent();
                if (userExists) {
                    // Send an error message if the user already exists.
                    res.status(401);
                    res.json({ message: "There is already a user with that username." });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.default.user.findUnique({
                        where: {
                            email: req.body.email
                        }
                    })];
            case 3:
                emailExists = _a.sent();
                if (emailExists) {
                    res.status(401);
                    res.json({ message: "The email address is already used by another account." });
                    return [2 /*return*/];
                }
                emailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailFormat.test(req.body.email)) {
                    res.status(401);
                    res.json({ message: "The email address is not formatted correctly." });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.default.user.create({
                        data: {
                            username: req.body.username,
                            email: req.body.email,
                            password: hash
                        }
                    })
                    // Create a token from our auth module
                ];
            case 4:
                user = _a.sent();
                token = (0, auth_1.createJWT)(user);
                // Get the user id and create a shopping list for the user
                // This is done so we can add recipes to the shopping list later on.
                return [4 /*yield*/, db_1.default.shoppingList.create({
                        data: {
                            belongsToId: user.id
                        }
                    })
                    // Fill the reponse with the JWT (Jason web token) 
                    // This token containts a user id and username (see auth.ts createJWT function)
                ];
            case 5:
                // Get the user id and create a shopping list for the user
                // This is done so we can add recipes to the shopping list later on.
                _a.sent();
                // Fill the reponse with the JWT (Jason web token) 
                // This token containts a user id and username (see auth.ts createJWT function)
                res.json({ token: token, username: user.username });
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
exports.createNewUser = createNewUser;
/**
 * Sign in a user.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next function.
 * @returns {Promise<void>} - A promise that resolves when the sign-in process is complete.
 */
var signIn = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var body, user, isValid, token, e_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log(req.body);
                body = req.body;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                return [4 /*yield*/, db_1.default.user.findUnique({
                        where: { username: body.loginname }
                    })
                    // If no user was found, try to find the user by email
                ];
            case 2:
                user = _a.sent();
                if (!!user) return [3 /*break*/, 4];
                return [4 /*yield*/, db_1.default.user.findUnique({
                        where: { email: body.loginname }
                    })];
            case 3:
                user = _a.sent();
                _a.label = 4;
            case 4:
                if (!user) {
                    res.status(401);
                    res.json({ message: "The username, email or password did not match. Please try again." });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, (0, auth_1.comparePasswords)(body.password, user.password)];
            case 5:
                isValid = _a.sent();
                if (!isValid) {
                    res.status(401);
                    res.json({ message: "The username, email or password did not match. Please try again." });
                    return [2 /*return*/];
                }
                token = (0, auth_1.createJWT)(user);
                res.json({ token: token, username: user.username });
                return [3 /*break*/, 7];
            case 6:
                e_2 = _a.sent();
                e_2.type = 'next';
                next(e_2);
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.signIn = signIn;
//# sourceMappingURL=user.js.map