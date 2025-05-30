import {
  partnersFqdn,
  appManagementFqdn,
  identityFqdn,
  normalizeStoreFqdn,
  businessPlatformFqdn,
  appDevFqdn,
  adminFqdn,
} from './fqdn.js'
import {spinFqdn} from '../context/spin.js'
import {Environment, serviceEnvironment} from '../../../private/node/context/service.js'
import {expect, describe, test, vi} from 'vitest'

vi.mock('../context/spin.js')
vi.mock('../../../private/node/context/service.js')

vi.mock('../vendor/dev_server/index.js', () => {
  return {
    DevServerCore: class {
      host(serviceName: string) {
        return `${serviceName}.myshopify.io`
      }
    },
    DevServer: class {
      constructor(private readonly serviceName: string) {}
      host() {
        return `${this.serviceName}.myshopify.io`
      }
    },
  }
})

describe('partners', () => {
  test('returns the local fqdn when the environment is local', async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Local)

    // When
    const got = await partnersFqdn()

    // Then
    expect(got).toEqual('partners.myshopify.io')
  })

  test('returns the production fqdn when the environment is production', async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Production)

    // When
    const got = await partnersFqdn()

    // Then
    expect(got).toEqual('partners.shopify.com')
  })

  test("returns the spin fqdn if the environment is spin and it's running in a Spin environment", async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Spin)
    vi.mocked(spinFqdn).mockResolvedValue('spin.com')

    // When
    const got = await partnersFqdn()

    // Then
    expect(got).toEqual('partners.spin.com')
  })
})

describe('appManagementFqdn', () => {
  test('returns the local fqdn when the environment is local', async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Local)

    // When
    const got = await appManagementFqdn()

    // Then
    expect(got).toEqual('app.myshopify.io')
  })

  test('returns the production fqdn when the environment is production', async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Production)

    // When
    const got = await appManagementFqdn()

    // Then
    expect(got).toEqual('app.shopify.com')
  })

  test("returns the spin fqdn if the environment is spin and it's running in a Spin environment", async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Spin)
    vi.mocked(spinFqdn).mockResolvedValue('spin.com')

    // When
    const got = await appManagementFqdn()

    // Then
    expect(got).toEqual('app.shopify.spin.com')
  })
})

describe('appDevFqdn', () => {
  test('returns the local fqdn when the environment is local', async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Local)
    const storeFqdn = 'mystore.myshopify.com'

    // When
    const got = await appDevFqdn(storeFqdn)

    // Then
    expect(got).toEqual('app.myshopify.io')
  })

  test('returns the store fqdn when the environment is production', async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Production)
    const storeFqdn = 'mystore.myshopify.com'

    // When
    const got = await appDevFqdn(storeFqdn)

    // Then
    expect(got).toEqual('mystore.myshopify.com')
  })

  test('returns the store fqdn when the environment is spin', async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Spin)
    const storeFqdn = 'mystore.myshopify.spin.dev'

    // When
    const got = await appDevFqdn(storeFqdn)

    // Then
    expect(got).toEqual('mystore.myshopify.spin.dev')
  })
})

describe('business-platform', () => {
  test('returns the local fqdn when the environment is local', async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Local)

    // When
    const got = await businessPlatformFqdn()

    // Then
    expect(got).toEqual('business-platform.myshopify.io')
  })

  test('returns the production fqdn when the environment is production', async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Production)

    // When
    const got = await businessPlatformFqdn()

    // Then
    expect(got).toEqual('destinations.shopifysvc.com')
  })

  test("returns the spin fqdn if the environment is spin and it's running in a Spin environment", async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Spin)
    vi.mocked(spinFqdn).mockResolvedValue('spin.com')

    // When
    const got = await businessPlatformFqdn()

    // Then
    expect(got).toEqual('business-platform.spin.com')
  })
})

describe('identity', () => {
  test('returns the local fqdn when the environment is local', async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Local)

    // When
    const got = await identityFqdn()

    // Then
    expect(got).toEqual('identity.myshopify.io')
  })

  test('returns the production fqdn when the environment is production', async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Production)

    // When
    const got = await identityFqdn()

    // Then
    expect(got).toEqual('accounts.shopify.com')
  })

  test("returns the spin fqdn if the environment is spin and it's running in a Spin environment", async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Spin)
    vi.mocked(spinFqdn).mockResolvedValue('spin.com')

    // When
    const got = await identityFqdn()

    // Then
    expect(got).toEqual('identity.spin.com')
  })
})

describe('adminFqdn', () => {
  test('returns the local fqdn when the environment is local', async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Local)

    // When
    const got = await adminFqdn()

    // Then
    expect(got).toEqual('admin.myshopify.io')
  })

  test('returns the production fqdn when the environment is production', async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Production)

    // When
    const got = await adminFqdn()

    // Then
    expect(got).toEqual('admin.shopify.com')
  })

  test("returns the spin fqdn if the environment is spin and it's running in a Spin environment", async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Spin)
    vi.mocked(spinFqdn).mockResolvedValue('spin.com')

    // When
    const got = await adminFqdn()

    // Then
    expect(got).toEqual('admin.shopify.spin.com')
  })
})

describe('normalizeStore', () => {
  test('parses store name with http', async () => {
    // When
    const got = await normalizeStoreFqdn('http://example.myshopify.com')

    // Then
    expect(got).toEqual('example.myshopify.com')
  })

  test('parses store name with https', async () => {
    // When
    const got = await normalizeStoreFqdn('https://example.myshopify.com')

    // Then
    expect(got).toEqual('example.myshopify.com')
  })

  test('parses store name with https when spin URL', async () => {
    // When
    const got = await normalizeStoreFqdn('https://devstore001.shopify.partners-6xat.test.us.spin.dev')

    // Then
    expect(got).toEqual('devstore001.shopify.partners-6xat.test.us.spin.dev')
  })

  test('parses store name without domain', async () => {
    // When
    const got = await normalizeStoreFqdn('example')

    // Then
    expect(got).toEqual('example.myshopify.com')
  })

  test('parses store name without domain in spin', async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Spin)
    vi.mocked(spinFqdn).mockResolvedValue('mydomain.spin.dev')

    // When
    const got = await normalizeStoreFqdn('example')

    // Then
    expect(got).toEqual('example.shopify.mydomain.spin.dev')
  })

  test('parses store name without domain in local', async () => {
    // Given
    vi.mocked(serviceEnvironment).mockReturnValue(Environment.Local)

    // When
    const got = await normalizeStoreFqdn('example')

    // Then
    expect(got).toEqual('example.myshopify.io')
  })
})
