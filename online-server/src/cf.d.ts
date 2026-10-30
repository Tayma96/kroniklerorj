// Cloudflare Workers ve Node 22'de ortak olan çalışma zamanı API'lerinin, bu projenin kullandığı kadarlık
// elle yazılmış tip tanımları. @cloudflare/workers-types bilerek kurulmaz; yeni bir API gerekirse buraya eklenir.

type BufferSource = ArrayBuffer | ArrayBufferView;
type BodyInit = string | ArrayBuffer | ArrayBufferView;
type HeadersInit = Headers | Record<string, string> | [string, string][];

interface Headers {
  get(name: string): string | null;
  set(name: string, value: string): void;
  has(name: string): boolean;
}
declare var Headers: { prototype: Headers; new (init?: HeadersInit): Headers };

interface RequestInit {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
}
interface Request {
  readonly method: string;
  readonly url: string;
  readonly headers: Headers;
  text(): Promise<string>;
  json(): Promise<unknown>;
}
declare var Request: { prototype: Request; new (input: string | Request, init?: RequestInit): Request };

interface ResponseInit {
  status?: number;
  headers?: HeadersInit;
}
interface Response {
  readonly status: number;
  readonly ok: boolean;
  readonly headers: Headers;
  text(): Promise<string>;
  json(): Promise<unknown>;
}
declare var Response: {
  prototype: Response;
  new (body?: BodyInit | null, init?: ResponseInit): Response;
};

declare var fetch: (input: string | Request, init?: RequestInit) => Promise<Response>;

interface URL {
  readonly pathname: string;
  readonly hostname: string;
}
declare var URL: { prototype: URL; new (url: string, base?: string): URL };

interface TextEncoder {
  encode(input?: string): Uint8Array<ArrayBuffer>;
}
declare var TextEncoder: { prototype: TextEncoder; new (): TextEncoder };
interface TextDecoder {
  decode(input?: BufferSource): string;
}
declare var TextDecoder: {
  prototype: TextDecoder;
  new (label?: string, options?: { fatal?: boolean }): TextDecoder;
};

declare function btoa(data: string): string;
declare function atob(data: string): string;
declare function structuredClone<T>(value: T): T;

declare var console: {
  log(...veri: unknown[]): void;
  warn(...veri: unknown[]): void;
  error(...veri: unknown[]): void;
};

// --- WebCrypto (yalnız kullanılan kısım) ---
type AlgoritmaKimligi = string | { name: string; [ayar: string]: unknown };
interface CryptoKey {
  readonly type: string;
  readonly extractable: boolean;
  readonly algorithm: unknown;
  readonly usages: string[];
}
interface CryptoKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}
interface JsonWebKey {
  kty?: string;
  kid?: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
  ext?: boolean;
  [alan: string]: unknown;
}
interface SubtleCrypto {
  importKey(
    format: "raw",
    keyData: BufferSource,
    algorithm: AlgoritmaKimligi,
    extractable: boolean,
    keyUsages: string[],
  ): Promise<CryptoKey>;
  importKey(
    format: "jwk",
    keyData: JsonWebKey,
    algorithm: AlgoritmaKimligi,
    extractable: boolean,
    keyUsages: string[],
  ): Promise<CryptoKey>;
  exportKey(format: "jwk", key: CryptoKey): Promise<JsonWebKey>;
  sign(algorithm: AlgoritmaKimligi, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>;
  verify(algorithm: AlgoritmaKimligi, key: CryptoKey, signature: BufferSource, data: BufferSource): Promise<boolean>;
  generateKey(algorithm: AlgoritmaKimligi, extractable: boolean, keyUsages: string[]): Promise<CryptoKeyPair>;
}
interface Crypto {
  readonly subtle: SubtleCrypto;
  getRandomValues<T extends ArrayBufferView>(array: T): T;
}
declare var crypto: Crypto;

// --- Durable Objects (KV depolama API'si; SQLite tabanlı DO'larda da geçerli) ---
interface DurableObjectId {
  toString(): string;
  equals(other: DurableObjectId): boolean;
}
interface DurableObjectStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>;
  put<T>(key: string, value: T): Promise<void>;
  put<T>(entries: Record<string, T>): Promise<void>;
  delete(key: string): Promise<boolean>;
}
interface DurableObjectState {
  readonly id: DurableObjectId;
  readonly storage: DurableObjectStorage;
}
interface DurableObjectStub {
  readonly id: DurableObjectId;
  fetch(input: string | Request, init?: RequestInit): Promise<Response>;
}
interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  idFromString(id: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}
