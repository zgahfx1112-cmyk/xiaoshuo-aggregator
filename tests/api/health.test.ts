import { NextResponse } from 'next/server'

// Mock NextResponse
const mockJson = jest.fn((data, init) => ({
  json: jest.fn().mockResolvedValue(data),
  status: init?.status || 200,
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: mockJson,
  },
}))

// Mock prisma and redis
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
  },
}))

jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
  })),
}))

// Import after mocks are set up
const { GET } = require('@/app/api/health/route')

describe('Health Check API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return healthy status', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.status).toBe('healthy')
    expect(data.timestamp).toBeDefined()
    expect(data.services).toEqual({
      database: 'connected',
      redis: 'connected',
    })
  })
})