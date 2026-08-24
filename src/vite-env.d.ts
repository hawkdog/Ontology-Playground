/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_AI_BUILDER: string;
  readonly VITE_ENABLE_LEGACY_FORMATS: string;
  readonly VITE_BASE_PATH: string;
  readonly VITE_GITHUB_CLIENT_ID: string;
  readonly VITE_GITHUB_OAUTH_BASE: string;
  readonly VITE_PROJECT_ANALYSIS_API_URL?: string;
  readonly VITE_PROJECT_ANALYSIS_MAP_ID?: string;
  readonly VITE_PROJECT_ANALYSIS_SHOW_SAMPLES?: string;
  readonly VITE_PROJECT_ANALYSIS_AUTO_LOAD?: string;
  readonly VITE_DEPLOYED_COMMIT_SHA?: string;
  readonly VITE_REPOSITORY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
