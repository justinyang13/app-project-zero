/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the SimCraft sync server (see sync-server/). Defaults to the owner's tailnet server when unset. */
  readonly VITE_SYNC_SERVER_URL?: string;
}
