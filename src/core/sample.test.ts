/**
 * Sample test to verify Jest configuration
 */

describe('Jest Setup Verification', () => {
  it('should run basic assertions', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support TypeScript types', () => {
    const value: string = 'TicketRush';
    expect(value).toBe('TicketRush');
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });
});
