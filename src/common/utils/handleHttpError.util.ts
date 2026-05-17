export type HandleHttpErrorOptions = {
  statusMessages?: Record<number, string>;
  codeMessages?: Record<string, string>;
};

type HttpErrorLike = {
  name?: string;
  message?: string;
  stack?: string;
  code?: string;
  cause?: {
    code?: string;
  };
  response?: {
    status?: number;
    statusText?: string;
    data?: {
      code?: string;
      status?: {
        code?: string;
        message?: string;
      };
    };
    headers?: unknown;
  };
};

export function handleHttpError(
  error: HttpErrorLike,
  fallbackMessage: string,
  options?: HandleHttpErrorOptions
): never {
  const causeMapper = {
    status: error?.response?.status,
    statusText: error?.response?.statusText,
    data: error?.response?.data,
    headers: error?.response?.headers,
  };

  const statusMessage = options?.statusMessages?.[causeMapper.status as number];
  const codeKey =
    error?.cause?.code ?? error?.response?.data?.code ?? error?.response?.data?.status?.code ?? error?.code;
  const codeMessage = codeKey ? options?.codeMessages?.[codeKey] : undefined;
  const responseStatusMessage = error?.response?.data?.status?.message;

  const messageMapper =
    statusMessage ??
    codeMessage ??
    responseStatusMessage ??
    (causeMapper.status === 500 ? fallbackMessage : (error?.message ?? fallbackMessage));

  const errorMapper = {
    stack: error?.stack,
    message: messageMapper,
    name: error?.name,
    cause: error?.response ? causeMapper : undefined,
  };

  throw structuredClone(errorMapper);
}
