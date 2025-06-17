import type { DailyCalculatorState } from '../store/slices/eccCalculatorSlice';
import type { PracticeCalculatorState } from '../store/slices/practiceCalculatorSlice';

// In-memory storage to avoid GDPR/ePrivacy concerns
class MemoryStorage {
  private dailyState: Partial<DailyCalculatorState> | null = null;
  private practiceState: Partial<PracticeCalculatorState> | null = null;

  setDailyState(state: Partial<DailyCalculatorState> | null): void {
    this.dailyState = state;
  }

  getDailyState(): Partial<DailyCalculatorState> | null {
    return this.dailyState;
  }

  setPracticeState(state: Partial<PracticeCalculatorState> | null): void {
    this.practiceState = state;
  }

  getPracticeState(): Partial<PracticeCalculatorState> | null {
    return this.practiceState;
  }

  clearDailyState(): void {
    this.dailyState = null;
  }

  clearPracticeState(): void {
    this.practiceState = null;
  }

  clearAll(): void {
    this.dailyState = null;
    this.practiceState = null;
  }
}

const memoryStorage = new MemoryStorage();

export function saveDailyState(state: DailyCalculatorState): void {
  try {
    // Deep clone to avoid reference issues
    const clonedState = JSON.parse(
      JSON.stringify(state, (key, value) => {
        // Handle BigInt serialization
        if (typeof value === 'bigint') {
          return '0x' + value.toString(16);
        }
        return value;
      })
    );

    // Parse BigInt values back
    const parsedState = JSON.parse(JSON.stringify(clonedState), (key, value) => {
      if (typeof value === 'string' && value.startsWith('0x') && /^0x[0-9a-fA-F]+$/.test(value)) {
        try {
          return BigInt(value);
        } catch {
          return value;
        }
      }
      return value;
    });

    memoryStorage.setDailyState(parsedState);
  } catch (error) {
    console.warn('Failed to save daily state:', error);
  }
}

export function loadDailyState(): Partial<DailyCalculatorState> | null {
  try {
    return memoryStorage.getDailyState();
  } catch (error) {
    console.warn('Failed to load daily state:', error);
    return null;
  }
}

export function savePracticeState(state: PracticeCalculatorState): void {
  try {
    // Deep clone to avoid reference issues
    const clonedState = JSON.parse(
      JSON.stringify(state, (key, value) => {
        // Handle BigInt serialization
        if (typeof value === 'bigint') {
          return '0x' + value.toString(16);
        }
        return value;
      })
    );

    // Parse BigInt values back
    const parsedState = JSON.parse(JSON.stringify(clonedState), (key, value) => {
      if (typeof value === 'string' && value.startsWith('0x') && /^0x[0-9a-fA-F]+$/.test(value)) {
        try {
          return BigInt(value);
        } catch {
          return value;
        }
      }
      return value;
    });

    memoryStorage.setPracticeState(parsedState);
  } catch (error) {
    console.warn('Failed to save practice state:', error);
  }
}

export function loadPracticeState(): Partial<PracticeCalculatorState> | null {
  try {
    return memoryStorage.getPracticeState();
  } catch (error) {
    console.warn('Failed to load practice state:', error);
    return null;
  }
}

export function clearDailyState(): void {
  memoryStorage.clearDailyState();
}

export function clearPracticeState(): void {
  memoryStorage.clearPracticeState();
}
