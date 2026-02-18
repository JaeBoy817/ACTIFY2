type SaveFn<TPayload> = (payload: TPayload) => Promise<void>;

class SaveQueue {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private latestPayload = new Map<string, unknown>();
  private inFlight = new Set<string>();

  enqueue<TPayload>(key: string, payload: TPayload, save: SaveFn<TPayload>, debounceMs = 450) {
    return new Promise<void>((resolve, reject) => {
      this.latestPayload.set(key, payload);

      const existingTimer = this.timers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(async () => {
        const latest = this.latestPayload.get(key) as TPayload;

        if (this.inFlight.has(key)) {
          resolve();
          this.enqueue(key, latest, save, debounceMs).catch(reject);
          return;
        }

        this.inFlight.add(key);
        try {
          await save(latest);
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          this.inFlight.delete(key);
        }
      }, debounceMs);

      this.timers.set(key, timer);
    });
  }
}

export const saveQueue = new SaveQueue();
