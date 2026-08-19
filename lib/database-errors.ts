export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "Unknown error");
}

export function isDatabaseConnectionError(error: unknown) {
  const message = getErrorMessage(error);
  const name = error instanceof Error ? error.name : "";

  return (
    name === "PrismaClientInitializationError" ||
    /error querying the database/i.test(message) ||
    /can't reach database server/i.test(message) ||
    /database server was reached but timed out/i.test(message) ||
    /FATAL:/i.test(message) ||
    /ENOTFOUND/i.test(message) ||
    /tenant\/user .* not found/i.test(message)
  );
}

