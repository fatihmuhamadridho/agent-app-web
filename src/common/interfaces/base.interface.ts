import { AxiosError } from 'axios';

export type Status = {
  code: number | string;
  message: string;
};

export type Meta = {
  page?: number;
  limit?: number;
  totalItems?: number;
  totalPages?: number;
  // react query
  nextPage?: number;
};

export type BaseResponse<D = unknown, M = Meta> = {
  status?: Status;
  data: D;
  meta?: M;
};

export type HttpError = AxiosError<{ status?: { code?: string | number; message?: string } }>;
