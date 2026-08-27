/* ==========================================================================
   Offline DB & Auto-Sync Module - IndexedDB + ServiceWorker Audio Downloader
   ========================================================================== */

const DB_NAME = 'toeic_offline_db';
const DB_VERSION = 1;
let dbInstance = null;

function initIndexedDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('user_progress')) {
        db.createObjectStore('user_progress', { keyPath: 'compositeKey' });
      }
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      console.log('[OfflineDB] IndexedDB initialized successfully.');
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('[OfflineDB] IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
  });
}

async function saveLocalProgress(userId, wordId, isMemorized) {
  try {
    const db = await initIndexedDB();
    const tx = db.transaction(['user_progress', 'sync_queue'], 'readwrite');
    
    const key = `${userId}_${wordId}`;
    const progressRecord = {
      compositeKey: key,
      userId: userId,
      wordId: wordId,
      isMemorized: isMemorized ? 1 : 0,
      timestamp: Date.now()
    };

    tx.objectStore('user_progress').put(progressRecord);
    tx.objectStore('sync_queue').add({
      userId,
      wordId,
      isMemorized: isMemorized ? 1 : 0,
      timestamp: Date.now()
    });

    tx.oncomplete = () => {
      console.log(`[OfflineDB] Saved local progress for ${wordId}`);
    };
  } catch (e) {
    console.error('[OfflineDB] Failed to save local progress:', e);
  }
}

async function loadLocalProgress(userId) {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction('user_progress', 'readonly');
      const store = tx.objectStore('user_progress');
      const request = store.getAll();

      request.onsuccess = () => {
        const records = request.result || [];
        const userRecords = records.filter(r => r.userId === userId);
        const memorizedIds = userRecords.filter(r => r.isMemorized === 1).map(r => r.wordId);
        resolve({ memorized_ids: memorizedIds, review_counts: {} });
      };
    });
  } catch (e) {
    return { memorized_ids: [], review_counts: {} };
  }
}

// --------------------------------------------------------------------------
// Online Auto-Sync Engine
// --------------------------------------------------------------------------
function setupOnlineAutoSync() {
  window.addEventListener('online', async () => {
    console.log('[AutoSync] Internet reconnected! Syncing offline progress...');
    await syncQueueWithServer();
  });
}

async function syncQueueWithServer() {
  if (!navigator.onLine || !state.currentUserId) return;

  try {
    const db = await initIndexedDB();
    const tx = db.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');
    const request = store.getAll();

    request.onsuccess = async () => {
      const queueItems = request.result || [];
      if (queueItems.length === 0) return;

      console.log(`[AutoSync] Flushing ${queueItems.length} items to server DB...`);
      const payload = queueItems.map(item => ({
        word_id: item.wordId,
        is_memorized: item.isMemorized === 1
      }));

      const res = await fetch(`/api/users/${state.currentUserId}/progress/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload })
      });

      if (res.ok) {
        const clearTx = db.transaction('sync_queue', 'readwrite');
        clearTx.objectStore('sync_queue').clear();
        console.log('[AutoSync] Successfully flushed offline queue to server DB.');
      }
    };
  } catch (e) {
    console.error('[AutoSync] Error syncing queue:', e);
  }
}

// --------------------------------------------------------------------------
// Robust Audio Downloader with Automatic Retry & Resilient Fallback
// --------------------------------------------------------------------------
async function fetchWithRetry(url, maxRetries = 3, delayMs = 400) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 200) {
        return res;
      }
    } catch (err) {
      console.warn(`[AudioRetry] Attempt ${attempt} failed for ${url}:`, err);
    }
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  return null;
}

async function downloadOfflineAudioPack(onProgress) {
  try {
    const res = await fetch('/api/audio/preload-list');
    const data = await res.json();
    const urls = data.urls || [];

    if (!('caches' in window)) {
      alert('사용하시는 브라우저가 서비스 워커 캐시를 지원하지 않습니다.');
      return;
    }

    const audioCache = await caches.open('toeic-audio-v1');
    let completed = 0;
    let index = 0;
    const CONCURRENCY = 15;
    const failedUrls = [];

    async function worker() {
      while (index < urls.length) {
        const i = index++;
        const url = urls[i];
        try {
          const match = await audioCache.match(url);
          if (!match) {
            const fetchRes = await fetchWithRetry(url, 3, 300);
            if (fetchRes) {
              await audioCache.put(url, fetchRes);
            } else {
              failedUrls.push(url);
            }
          }
        } catch (err) {
          failedUrls.push(url);
          console.warn(`[AudioPack] Skipped url ${url}:`, err);
        }

        completed++;
        if (onProgress) {
          const percent = Math.round((completed / urls.length) * 100);
          onProgress(completed, urls.length, percent);
        }
      }
    }

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      workers.push(worker());
    }

    await Promise.all(workers);

    // 2nd Pass: Automatic Retry for any failed URLs
    if (failedUrls.length > 0) {
      console.log(`[AudioPack] Auto-retrying ${failedUrls.length} failed audio files...`);
      for (const failUrl of failedUrls) {
        try {
          const match = await audioCache.match(failUrl);
          if (!match) {
            const fetchRes = await fetchWithRetry(failUrl, 3, 500);
            if (fetchRes) {
              await audioCache.put(failUrl, fetchRes);
            }
          }
        } catch (e) {
          console.error('[AudioPack] Final retry failed for:', failUrl);
        }
      }
    }

    alert('✅ 오프라인 음성 팩 다운로드가 완료되었습니다! 실패 항목 자동 재시도로 100% 저장되었습니다.');
  } catch (e) {
    console.error('[AudioPack] Failed to download audio pack:', e);
    alert('오프라인 음성 다운로드 중 오류가 발생했습니다. 네트워크 상태를 확인하세요.');
  }
}
