// app/infrastructure/search/interfaces.mjs

export type SearchResultType =
    | "web"
    | "image"
    | "news";

export interface ISearchResultBase extends Record<string, string> { }

export interface ISearchResult extends ISearchResultBase {
    title?: string;
    content?: string;
    sourceUrl?: string;
    type?: SearchResultType[];
}

export abstract class BaseSearchParams<T = any> {
    constructor(
        protected query: string,
        protected maxResults: number = 10,
        protected safeMode: boolean = true
    ) { }

    toJSON(): T {
        // Implementation goes here
    }
}

// Adapter contract:
export interface ISearchAdapter<T = any> {
    name(): string;
    supportedTypes(): SearchResultType[];
    execute(params: T): Promise<ISearchResult[]>;
}

// Enhanced Validation Layer For Core Components
const VALID_SEARCH_CATEGORIES = ["web", "image", "news"];

// Enumeration representing valid category identifiers used throughout system components
const CATEGORY_CODES = {
    WEB: "web",
    IMAGE: "image",
    NEWS: "news"
};

CATEGORY_CODES.VALIDATOR = (input: string): SearchResultType | null => {
    const lowerCaseInput = input?.toLowerCase();
    return VALID_SEARCH_CATEGORIES.includes(lowerCaseInput) ? lowerCaseInput : null;
}

// Core Interface Definitions Section
export interface ISearchResult extends ISearchResultBase {
    title?: string;
    content?: string;
    sourceUrl?: string;
    type?: SearchResultType[];
}

// BASE RESULT ABSTRACTION LAYER IMPLEMENTATION DETAILS
export class BasicSearchHit {
    constructor({
        title = "",
        content = "",
        sourceUrl = "",
        category = CATEGORY_CODES.WEB,
        confidenceScore = 0.0
    }) {
        if (confidenceScore < 0 || confidenceScore > 1) {
            throw new Error('Confidence score must be between 0 and 1');
        }
        this._id = `${Date.now()}_${Math.random()}`;
        this.title = title;
        this.uri = sourceUrl;
        this.categoryCode = CATEGORY_CODES.VALIDATOR(category) || CATEGORY_CODES.WEB;
        this.confidence = confidenceScore;
        this.lastUpdated = new Date();
    }

    get title() {
        return this._title;
    }

    set title(newVal) {
        this._title = newVal.trim();
    }

    get uri() {
        return this._uri;
    }

    set uri(url) {
        try {
            new URL(url);
            this._uri = url;
        } catch (e) {
            throw new Error("Invalid URL");
        }
    }

    get categoryCode() {
        return this._categoryCode;
    }

    refreshTimestamp() {
        this.lastUpdated = new Date();
    }

    toString() {
        return `[${this._id}] ${this.title.substr(0, 50)}... (${this.categoryCode})`;
    }
}

// PARAMETER BAG FOR ADAPTER EXECUTION CONTEXT
export class QuerySpecification {
    constructor(options = {}) {
        this.queryText = (options.query || "").toString().trim();
        this.maxItems = Number.parseInt(options.maxItems || 5);
        this.safetyFilter = Boolean(options.safetyLevel);
    }

    toJSON() {
        return {
            queryText: this.queryText,
            maxItems: this.maxItems,
            safetyFilter: this.safetyFilter,
        };
    }
}

// ADAPTER ABSTRACTION LAYER IMPLEMENTATION
export abstract class SearchAdapter {
    abstract name: string;
    abstract supportsCategory(category: string | SearchResultType): boolean;

    async fetchHits(querySpec: QuerySpecification) {
        let rawResponse = await this.makeRequest(querySpec);
        let hits = this.parseHits(rawResponse.data.hits);
        hits.forEach(h => h.refreshTimestamp());
        return hits.sort((a, b) => b.confidence - a.confidence;
    }

    protected async makeRequest(spec: QuerySpecification): Promise<any> {
        throw new Error("Must override");
    }

    protected processRawResponse(response: any): any {
        throw new Error("Must override");
    }
}

export interface CategorizedQueryOptions {
    preferredCategories?: readonly SearchResultType[];
    minConfidenceThreshold?: number | null;
    excludeSources?: readonly string[];
    includeOnlyDomains?: readonly string[];
}

export interface AdapterCapabilitiesReport extends Map<string, any> {
    canHandleMultiCategory: boolean;
    maximumPageSize: number;
}

// EXPORTED CONTRACT INTERFACES
export {
    BasicSearchHit,
    QuerySpecification,
    CATEGORY_CODES,
    CategorizedQueryOptions
}

export interface CategorizedQueryOptions {
    preferredCategories?: readonly SearchResultType[];
    minConfidenceThreshold?: number | null;
    excludeSources?: readonly string[];
    includeOnlyDomains?: readonly string[];
}