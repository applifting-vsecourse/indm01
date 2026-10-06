import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

// jsdom lacks the pointer-capture and scrolling APIs Radix Select calls when
// it opens, so stub them for any test that interacts with a select.
Object.assign(Element.prototype, {
  hasPointerCapture: vi.fn(() => false),
  releasePointerCapture: vi.fn(),
  scrollIntoView: vi.fn(),
})
