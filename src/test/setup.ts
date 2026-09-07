import "@testing-library/jest-dom";

// Mock URL methods for jsdom
if (typeof window !== "undefined") {
  window.URL.createObjectURL = () => "mock-url";
  window.URL.revokeObjectURL = () => {};
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
