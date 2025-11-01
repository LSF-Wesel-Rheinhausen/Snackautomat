import { ref } from 'vue';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export interface ApiRequestOptions extends RequestInit {
  query?: Record<string, string | number | boolean | undefined>;
  parseJson?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export class ApiError<T = unknown> extends Error {
  public readonly status: number;
  public readonly payload?: T;

  constructor(message: string, status: number, payload?: T) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function buildUrl(path: string, query?: ApiRequestOptions['query']) {
  const base = API_BASE_URL.startsWith('http')
    ? new URL(API_BASE_URL)
    : new URL(API_BASE_URL, window.location.origin);
  const normalizedBasePath = base.pathname.endsWith('/')
    ? base.pathname.slice(0, -1)
    : base.pathname;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(base.toString());
  url.pathname = `${normalizedBasePath}${normalizedPath}`;
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.toString();
}

export function resolveApiUrl(path: string, query?: ApiRequestOptions['query']) {
  return buildUrl(path, query);
}

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
  const { query, parseJson = true, headers, body, ...rest } = options;
  const url = buildUrl(path, query);
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {})
    },
    body,
    ...rest
  });

  const contentType = response.headers.get('content-type');
  const isJson = parseJson && contentType?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError(
      `Request to ${path} failed with status ${response.status}`,
      response.status,
      payload
    );
  }

  return {
    data: (payload ?? null) as T,
    status: response.status
  };
}

export function useApi() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function run<T>(path: string, init: ApiRequestOptions) {
    loading.value = true;
    error.value = null;
    try {
      const result = await request<T>(path, init);
      return result;
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message;
        throw err;
      }
      error.value = 'Unerwarteter Fehler bei der Kommunikation mit dem Backend.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    get: <T>(path: string, options: ApiRequestOptions = {}) =>
      run<T>(path, { ...options, method: 'GET' }),
    post: <T>(path: string, payload?: unknown, options: ApiRequestOptions = {}) =>
      run<T>(path, {
        ...options,
        method: 'POST',
        body: payload ? JSON.stringify(payload) : undefined
      }),
    put: <T>(path: string, payload?: unknown, options: ApiRequestOptions = {}) =>
      run<T>(path, {
        ...options,
        method: 'PUT',
        body: payload ? JSON.stringify(payload) : undefined
      }),
    patch: <T>(path: string, payload?: unknown, options: ApiRequestOptions = {}) =>
      run<T>(path, {
        ...options,
        method: 'PATCH',
        body: payload ? JSON.stringify(payload) : undefined
      }),
    del: <T>(path: string, options: ApiRequestOptions = {}) =>
      run<T>(path, { ...options, method: 'DELETE' })
  };
}
