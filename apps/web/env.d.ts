/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API. Leave empty to use the `/api` dev proxy. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
