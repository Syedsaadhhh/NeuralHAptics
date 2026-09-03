import { SearchCorridorOptions, SearchCorridorResult, searchCorridors } from './candidateSearch';
import { WorkerSearchResponse } from '../workers/trajectoryWorker';

let workerInstance: Worker | null = null;

function getWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }
  if (!workerInstance) {
    try {
      workerInstance = new Worker(
        new URL('../workers/trajectoryWorker.ts', import.meta.url),
        { type: 'module' }
      );
    } catch {
      workerInstance = null;
    }
  }
  return workerInstance;
}

/**
 * Executes multi-objective corridor search asynchronously in a Web Worker,
 * with seamless fallback to main thread if workers are unavailable.
 */
export async function executeCorridorSearch(
  options: SearchCorridorOptions
): Promise<SearchCorridorResult> {
  const worker = getWorker();

  if (!worker) {
    // Synchronous fallback
    return searchCorridors(options);
  }

  return new Promise<SearchCorridorResult>((resolve, reject) => {
    const handleMessage = (event: MessageEvent<WorkerSearchResponse>) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);

      if (event.data.type === 'SEARCH_SUCCESS' && event.data.result) {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data.error || 'Worker search failed'));
      }
    };

    const handleError = (_error: ErrorEvent) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      // Fall back to synchronous on worker error
      try {
        resolve(searchCorridors(options));
      } catch (err) {
        reject(err);
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    worker.postMessage({
      type: 'SEARCH_CORRIDORS',
      options,
    });
  });
}
