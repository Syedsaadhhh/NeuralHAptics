import { searchCorridors, SearchCorridorOptions } from '../core/candidateSearch';

export interface WorkerSearchRequest {
  type: 'SEARCH_CORRIDORS';
  options: SearchCorridorOptions;
}

export interface WorkerSearchResponse {
  type: 'SEARCH_SUCCESS' | 'SEARCH_ERROR';
  result?: ReturnType<typeof searchCorridors>;
  error?: string;
}

self.onmessage = (event: MessageEvent<WorkerSearchRequest>) => {
  const { type, options } = event.data;

  if (type === 'SEARCH_CORRIDORS') {
    try {
      const result = searchCorridors(options);
      const response: WorkerSearchResponse = {
        type: 'SEARCH_SUCCESS',
        result,
      };
      self.postMessage(response);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const response: WorkerSearchResponse = {
        type: 'SEARCH_ERROR',
        error: errorMessage,
      };
      self.postMessage(response);
    }
  }
};
