import { friendlyError } from "./chain";
import { AppError } from "./errors";

function failure(err: unknown) {
  if (err instanceof AppError) return Response.json({ error: err.message }, { status: err.status });
  console.error(err);
  return Response.json({ error: friendlyError(err) }, { status: 500 });
}

export function route(fn: (req: Request) => Promise<unknown>) {
  return async (req: Request) => {
    try {
      return Response.json((await fn(req)) ?? { ok: true });
    } catch (err) {
      return failure(err);
    }
  };
}

export function paramRoute<P>(fn: (req: Request, params: P) => Promise<unknown>) {
  return async (req: Request, { params }: { params: Promise<P> }) => {
    try {
      return Response.json((await fn(req, await params)) ?? { ok: true });
    } catch (err) {
      return failure(err);
    }
  };
}

export async function body<T>(req: Request): Promise<Partial<T>> {
  try {
    return await req.json();
  } catch {
    throw new AppError("Invalid request.");
  }
}
