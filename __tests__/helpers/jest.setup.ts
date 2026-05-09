import { Blob, File } from "node:buffer";
import { TextDecoder, TextEncoder } from "node:util";

if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
}

if (!globalThis.TextDecoder) {
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}

if (!globalThis.Blob) {
  globalThis.Blob = Blob as typeof globalThis.Blob;
}

if (!globalThis.File) {
  globalThis.File = File as typeof globalThis.File;
}

process.env.NEXTAUTH_URL ??= "http://localhost:3000";
process.env.AUTH_SECRET ??= "test-secret";
