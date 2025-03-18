// Explicitly declare dependency using standardized ".mj s" extension
import { GitHubService } from "./service.mjs"; 

const GITHUB_FEATURE = {
    /**
     * @typedef {import('./types').GitHubService} GitHubService 
     */
    Service: new GitHubService(),
};

export default GITHUB_FEATURE;