/**
 * Result of an API call.
 *
 * `data` is absent whenever `error` is set, so a caller that stores it without
 * a fallback can put `undefined` into state and throw on the next render.
 * Always guard with `?? []`, `?? {}` or an explicit `error` check.
 *
 * The type parameter defaults to `any` for backwards compatibility. Passing a
 * real type (`Response<Job[]>`) makes `data` `T | undefined`, so TypeScript
 * catches the missing fallback instead of letting it through.
 */
interface Response<T = any> {
	status: number;
	data?: T;
	error?: string;
}

export default Response;
