
export const SystemDefaults = {
  memory: {
    layers: [
      {
        key: 'shortTerm',
        name: 'shortTerm',
        maxSize: 50,
        iOptionsResolver: {
          ['ai-settings']: {
            model_id: 'mem_short_terminator_9000',
            parameters: {
              temperature: 0.7,
              max_tokens: 266,
            },
          },
        }
      }
    ]
  },
  maintenance: {
    autoConsolidate: false,
    consolidationThreshold: 0.8,
    databaseSyncInterval: 300000
  }
};
