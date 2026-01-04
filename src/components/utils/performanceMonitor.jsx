/**
 * Utilitaire de monitoring de performance
 */

// Cache en mémoire pour éviter les requêtes répétées
const memoryCache = new Map();

export const cacheManager = {
  get: (key) => {
    const cached = memoryCache.get(key);
    if (!cached) return null;
    
    const { data, timestamp, ttl } = cached;
    if (Date.now() - timestamp > ttl) {
      memoryCache.delete(key);
      return null;
    }
    
    return data;
  },
  
  set: (key, data, ttl = 5 * 60 * 1000) => {
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  },
  
  clear: (key) => {
    if (key) {
      memoryCache.delete(key);
    } else {
      memoryCache.clear();
    }
  }
};

// Mesurer le temps d'exécution d'une fonction
export const measureTime = async (label, fn) => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`❌ ${label} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
};

// Debounce pour éviter trop d'appels
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle pour limiter la fréquence
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Batch des requêtes similaires
export class RequestBatcher {
  constructor(batchFn, delay = 50) {
    this.batchFn = batchFn;
    this.delay = delay;
    this.queue = [];
    this.timeout = null;
  }

  add(item) {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject });
      
      if (this.timeout) clearTimeout(this.timeout);
      
      this.timeout = setTimeout(async () => {
        const batch = [...this.queue];
        this.queue = [];
        
        try {
          const results = await this.batchFn(batch.map(b => b.item));
          batch.forEach((b, i) => b.resolve(results[i]));
        } catch (error) {
          batch.forEach(b => b.reject(error));
        }
      }, this.delay);
    });
  }
}