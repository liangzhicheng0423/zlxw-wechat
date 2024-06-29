import { NextFunction } from 'express';

export const asyncHandler = (fn: Function) => (req: any, res: any, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
