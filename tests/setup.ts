import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// Mock Web Speech Recognition and AudioContext for headless test environments
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  (window as any).AudioContext = vi.fn().mockImplementation(() => ({
    createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn() }),
    createAnalyser: vi.fn().mockReturnValue({
      fftSize: 256,
      frequencyBinCount: 128,
      getByteFrequencyData: vi.fn(),
    }),
    close: vi.fn().mockResolvedValue(undefined),
    state: 'running',
  }));

  (window as any).webkitAudioContext = (window as any).AudioContext;
}
