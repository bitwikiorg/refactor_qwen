export const SystemDefaults: {
  Memory: {
    memory?: {
      layers?: {
        aiSettings: {
          model: string;
          parameters: Record<string, string | number> | null;
        };
        maxSize: number;
      }[];
    };
  };
};
