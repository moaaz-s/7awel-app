declare module 'capacitor-secure-storage-plugin' {
  export interface SecureStoragePluginType {
    get(options: { key: string }): Promise<{ value: string | null }>;
    set(options: { key: string; value: string }): Promise<void>;
    remove(options: { key: string }): Promise<void>;
  }

  // Default export style used by plugin
  export const SecureStoragePlugin: SecureStoragePluginType;
}
