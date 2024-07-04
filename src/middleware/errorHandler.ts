import { NextFunction, Request, Response } from 'express';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack); // 打印错误堆栈信息
  // res.status(500).json({ message: 'Internal Server Error' }); // 返回通用错误信息
};
