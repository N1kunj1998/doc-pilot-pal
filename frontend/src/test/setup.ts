import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement matchMedia — ThemeProvider's "system" mode calls it
// on every mount, so any test rendering a component under ThemeProvider needs
// this polyfill, not just theme.test.tsx (which previously stubbed it locally).
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
