/**
 * Mock 实现的契约测试。
 */
import { describe } from 'vitest'
import { MockModelGateway, fixtures } from './model-gateway-mock.js'
import { runModelGatewayContractTests } from './model-gateway.contract.js'

describe('MockModelGateway contract', () => {
  runModelGatewayContractTests(
    () =>
      new MockModelGateway({
        providers: fixtures.providers,
        quota: fixtures.quota,
      }),
  )
})
