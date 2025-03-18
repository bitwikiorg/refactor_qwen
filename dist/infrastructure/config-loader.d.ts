interface Layer {
    aiSettings: {
        model: string;
        parameters: Record<string, string | number> | null;
    };
    maxSize: number;
}
interface RawConfigurationInput {
    memory?: {
        layers?: Layer[];
    };
}
interface IConfigurationSource {
    initialized: boolean;
    layers: ReadonlyArray<Layer>;
}
declare class ConfigLoader implements IConfigurationSource {
    private readonly _rawData;
    private readonly _defaults;
    private _merged;
    private __initialized;
    constructor(rawData?: RawConfigurationInput);
    get initialized(): boolean;
    get layers(): ReadonlyArray<Layer>;
    protected load(override?: boolean): Promise<void>;
    protected validate(): Promise<void>;
    private verifyMemoryConstraints;
    private enforceParameterValidity;
    private assertValidModel;
    private fetchAvailableAIModels;
}
export { ConfigLoader, IConfigurationSource, Layer, RawConfigurationInput };
