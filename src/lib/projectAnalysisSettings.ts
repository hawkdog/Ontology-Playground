export function projectAnalysisSamplesEnabled(): boolean {
  return import.meta.env.VITE_PROJECT_ANALYSIS_SHOW_SAMPLES !== 'false';
}

export function projectAnalysisAutoLoadEnabled(): boolean {
  return import.meta.env.VITE_PROJECT_ANALYSIS_AUTO_LOAD === 'true';
}
