export type MutationOptions = { signal?: AbortSignal };

function isMutationOptions(value: unknown): value is MutationOptions {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('signal' in value || Object.keys(value).length === 0)
  );
}

/** Coalesce parallel identical mutations (double-submit, Strict Mode, socket reconnect). */
export function createKeyedMutation<TArgs extends unknown[], TResult>(config: {
  key: (...args: TArgs) => string;
  execute: (...args: [...TArgs, MutationOptions?]) => Promise<TResult>;
}): (...args: [...TArgs, MutationOptions?]) => Promise<TResult> {
  const inFlight = new Map<string, Promise<TResult>>();

  return ((...allArgs: [...TArgs, MutationOptions?]) => {
    const args = [...allArgs] as unknown[];
    const maybeOptions =
      args.length > 0 && isMutationOptions(args[args.length - 1])
        ? (args.pop() as MutationOptions)
        : undefined;
    const keyArgs = args as TArgs;
    const cacheKey = config.key(...keyArgs);

    const existing = inFlight.get(cacheKey);
    if (existing) return existing;

    const request = config.execute(...keyArgs, maybeOptions).finally(() => {
      inFlight.delete(cacheKey);
    });

    inFlight.set(cacheKey, request);
    return request;
  }) as (...args: [...TArgs, MutationOptions?]) => Promise<TResult>;
}

/** Single in-flight mutation (e.g. create instant meeting with default payload). */
export function createSingletonMutation<TResult>(
  execute: (options?: MutationOptions) => Promise<TResult>,
): (options?: MutationOptions) => Promise<TResult> {
  return createKeyedMutation({
    key: () => 'singleton',
    execute: (_options?: MutationOptions) => execute(_options),
  });
}
