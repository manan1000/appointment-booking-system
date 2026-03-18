import type { Response } from "express";

export function successResponse(res: Response, statusCode: number, data: any) {
    return res.status(statusCode).json({
        success: true,
        data,
        error: null
    });
}

export function errorResponse(res: Response, statusCode: number, errorCode: string) {
    return res.status(statusCode).json({
        success: false,
        data: null,
        error: errorCode
    });
}