import { NextFunction, Request, Response } from "express";
import { AuthenticateOptions, AuthorizeOptions } from "oauth2-server";
export declare function authorizeHandler(options?: AuthorizeOptions): (req: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("express-serve-static-core").Query>, res: Response<any>, next: NextFunction) => Promise<void>;
export declare function authenticateHandler(options?: AuthenticateOptions): (req: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("express-serve-static-core").Query>, res: Response<any>, next: NextFunction) => Promise<void>;
