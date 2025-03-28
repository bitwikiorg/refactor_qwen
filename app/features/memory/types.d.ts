export interface StorageInterface {
  commitTransaction: () => void;
  rollbackTransaction: () => void;
  store: (txid: string, payload: any) => Promise<any>;
}
