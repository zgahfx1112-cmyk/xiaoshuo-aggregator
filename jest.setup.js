import '@testing-library/jest-dom'

// Polyfill TextDecoder/TextEncoder for undici (used by cheerio)
import { TextDecoder, TextEncoder } from 'util'
global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.REDIS_TOKEN = 'test-token'