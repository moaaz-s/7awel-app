import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { transactionService, TransactionError, TransactionStatus, CASH_OUT_METHODS } from '@/services/transaction-service';
import { apiService } from '@/services/api-service';
import { httpClient } from '@/services/http-client';
import type { Transaction, TransactionType, Contact, ApiResponse, Paginated, TransactionFilters, PaginationRequest } from '@/types';
import { ErrorCode } from '@/types/errors';

// Mock dependencies
vi.mock('@/services/api-service', () => ({
  apiService: {
    sendMoney: vi.fn(),
    cashOut: vi.fn(),
    getTransactions: vi.fn(),
  },
}));

vi.mock('@/services/http-client', () => ({
  httpClient: {
    init: vi.fn(),
    clearToken: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/services/storage-manager', () => ({
  getStorageManager: () => ({
    local: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(true),
      getAll: vi.fn().mockResolvedValue([]),
    },
  }),
}));

vi.mock('@/utils/cache', () => ({
  memoryCache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe('Transaction Service Integration Tests', () => {
  const mockContact: Contact = {
    id: 'contact-1',
    name: 'John Doe',
    phone: '+1234567890',
    email: 'john@example.com',
    initial: 'J'
  };

  const mockTransaction: Transaction = {
    id: 'tx-123',
    name: 'Send Money',
    amount: 100,
    date: new Date().toISOString(),
    type: 'send' as TransactionType,
    status: 'completed' as any,
    recipientId: 'contact-1',
    senderId: 'user-1',
    assetSymbol: 'USD',
    note: 'Test transaction'
  };

  beforeEach(async () => {
    // Mock console methods to reduce noise during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await httpClient.init();
    vi.clearAllMocks();
  });

  afterEach(() => {
    httpClient.clearToken();
    vi.restoreAllMocks();
  });

  describe('Transaction Validation', () => {
    it('should validate valid amount and balance', () => {
      const result = transactionService.validateAmount(100, 200);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject negative amounts', () => {
      const result = transactionService.validateAmount(-50, 200);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(TransactionError.INVALID_AMOUNT);
    });

    it('should reject zero amounts', () => {
      const result = transactionService.validateAmount(0, 200);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(TransactionError.INVALID_AMOUNT);
    });

    it('should reject NaN amounts', () => {
      const result = transactionService.validateAmount(NaN, 200);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(TransactionError.INVALID_AMOUNT);
    });

    it('should reject amounts exceeding balance', () => {
      const result = transactionService.validateAmount(300, 200);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(TransactionError.INSUFFICIENT_FUNDS);
    });

    it('should accept amount equal to balance', () => {
      const result = transactionService.validateAmount(200, 200);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Amount and Fee Calculations', () => {
    it('should format amount correctly for numbers', () => {
      expect(transactionService.formatAmount(100)).toBe('100.00');
      expect(transactionService.formatAmount(99.5)).toBe('99.50');
      expect(transactionService.formatAmount(0.1)).toBe('0.10');
    });

    it('should format amount correctly for strings', () => {
      expect(transactionService.formatAmount('100')).toBe('100.00');
      expect(transactionService.formatAmount('99.5')).toBe('99.50');
      expect(transactionService.formatAmount('0.1')).toBe('0.10');
    });

    it('should calculate fees correctly', () => {
      expect(transactionService.calculateFee(100, 1.5)).toBe('1.50');
      expect(transactionService.calculateFee(200, 2.0)).toBe('4.00');
      expect(transactionService.calculateFee(50, 0.5)).toBe('0.25');
    });

    it('should calculate total with fees correctly', () => {
      expect(transactionService.calculateTotal(100, 1.5)).toBe('101.50');
      expect(transactionService.calculateTotal(200, 2.0)).toBe('204.00');
      expect(transactionService.calculateTotal(50, 0.5)).toBe('50.25');
    });

    it('should handle zero fee percentage', () => {
      expect(transactionService.calculateFee(100, 0)).toBe('0.00');
      expect(transactionService.calculateTotal(100, 0)).toBe('100.00');
    });
  });

  describe('Date Formatting and Reference Generation', () => {
    it('should format dates correctly', () => {
      const date = new Date('2023-12-25T10:30:00Z');
      const formatted = transactionService.formatDate(date);
      
      expect(formatted).toMatch(/December 25, 2023/);
    });

    it('should format string dates correctly', () => {
      const formatted = transactionService.formatDate('2023-12-25T10:30:00Z');
      
      expect(formatted).toMatch(/December 25, 2023/);
    });

 

    it('should generate references with custom prefix', () => {
      const ref = transactionService.generateReference('REQ');
      
      expect(ref).toMatch(/^REQ\d+$/);
    });
  });

  describe('Send Money Operations', () => {
    it('should send money successfully', async () => {
      vi.mocked(apiService.sendMoney).mockResolvedValue({
        error: undefined,
        data: mockTransaction,
        statusCode: 200,
        message: 'Success',
        traceId: 'test-trace-id'
      });

      const result = await transactionService.sendMoney(mockContact, 100, 200, 'Test payment');

      expect(result.success).toBe(true);
      expect(result.transaction).toEqual(mockTransaction);
      expect(result.error).toBeUndefined();
      expect(apiService.sendMoney).toHaveBeenCalledWith(mockContact.id, 100, 'Test payment');
    });

    it('should handle API errors in send money', async () => {
      vi.mocked(apiService.sendMoney).mockResolvedValue({
        error: 'Payment failed',
        data: undefined,
        statusCode: 400,
        message: 'Bad Request',
        traceId: 'test-trace-id'
      });

      const result = await transactionService.sendMoney(mockContact, 100, 200);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment failed');
      expect(result.transaction).toBeUndefined();
    });

    it('should handle insufficient funds in send money', async () => {
      const result = await transactionService.sendMoney(mockContact, 300, 200);

      expect(result.success).toBe(false);
      expect(result.error).toBe(TransactionError.INSUFFICIENT_FUNDS);
      expect(apiService.sendMoney).not.toHaveBeenCalled();
    });

    it('should handle network errors in send money', async () => {
      vi.mocked(apiService.sendMoney).mockRejectedValue(new Error('Network error'));

      const result = await transactionService.sendMoney(mockContact, 100, 200);

      expect(result.success).toBe(false);
      expect(result.error).toBe(TransactionError.TRANSACTION_FAILED);
    });

    it('should handle API success without data', async () => {
      vi.mocked(apiService.sendMoney).mockResolvedValue({
        error: undefined,
        data: undefined,
        statusCode: 200,
        message: 'Success',
        traceId: 'test-trace-id'
      });

      const result = await transactionService.sendMoney(mockContact, 100, 200);

      expect(result.success).toBe(true);
      expect(result.transaction).toBeUndefined();
    });
  });

  describe('Cash Out Operations', () => {
    it('should cash out successfully', async () => {
      vi.mocked(apiService.cashOut).mockResolvedValue({
        error: undefined,
        data: { 
          reference: 'CASH-123',
          amount: 100,
          fee: 1.5,
          method: 'atm',
          date: new Date().toISOString()
        },
        statusCode: 200,
        message: 'Success',
        traceId: 'test-trace-id'
      });

      const result = await transactionService.cashOut(100, 'atm', 200);

      expect(result.success).toBe(true);
      expect(result.reference).toBe('CASH-123');
      expect(result.error).toBeUndefined();
      expect(apiService.cashOut).toHaveBeenCalledWith(100, 'atm');
    });

    it('should handle invalid cash out method', async () => {
      const result = await transactionService.cashOut(100, 'invalid-method', 200);

      expect(result.success).toBe(false);
      expect(result.error).toBe(TransactionError.INVALID_METHOD);
      expect(apiService.cashOut).not.toHaveBeenCalled();
    });

    it('should handle API errors in cash out', async () => {
      vi.mocked(apiService.cashOut).mockResolvedValue({
        error: 'Cash out failed',
        data: undefined,
        statusCode: 400,
        message: 'Bad Request',
        traceId: 'test-trace-id'
      });

      const result = await transactionService.cashOut(100, 'atm', 200);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cash out failed');
    });

    it('should handle network errors in cash out', async () => {
      vi.mocked(apiService.cashOut).mockRejectedValue(new Error('Network error'));

      const result = await transactionService.cashOut(100, 'atm', 200);

      expect(result.success).toBe(false);
      expect(result.error).toBe(TransactionError.TRANSACTION_FAILED);
    });

    it('should validate all available cash out methods', () => {
      CASH_OUT_METHODS.forEach(method => {
        expect(method).toHaveProperty('id');
        expect(method).toHaveProperty('name');
        expect(method).toHaveProperty('fee');
        expect(method).toHaveProperty('feePercentage');
        expect(typeof method.feePercentage).toBe('number');
      });
    });
  });

  describe('QR Code Generation', () => {
    it('should generate payment request QR correctly', () => {
      const { qrData, qrString } = transactionService.requestMoney('user-123', 100);

      expect(qrData.userId).toBe('user-123');
      expect(qrData.amount).toBe(100);
      expect(qrData.reference).toMatch(/^REQ\d+$/);
      expect(qrData.timestamp).toBeGreaterThan(0);
      expect(qrString).toBe(JSON.stringify(qrData));
    });

    it('should generate payment QR correctly', () => {
      const { qrData, qrString } = transactionService.generatePaymentQR('user-123');

      expect(qrData.userId).toBe('user-123');
      expect(qrData.amount).toBeUndefined();
      expect(qrData.timestamp).toBeGreaterThan(0);
      expect(qrString).toBe(JSON.stringify(qrData));
    });

    it('should throw error for invalid amount in request money', () => {
      expect(() => transactionService.requestMoney('user-123', 0)).toThrow(TransactionError.INVALID_AMOUNT);
      expect(() => transactionService.requestMoney('user-123', -50)).toThrow(TransactionError.INVALID_AMOUNT);
      expect(() => transactionService.requestMoney('user-123', NaN)).toThrow(TransactionError.INVALID_AMOUNT);
    });
  });


  describe('Transaction History and Listing', () => {
    const mockTransactions = [mockTransaction];
    const mockPaginatedResponse = {
      items: mockTransactions,
      nextCursor: null,
      total: 1,
      page: 1,
      limit: 10,
      pages: 1
    };

    it('should list transactions successfully', async () => {
      vi.mocked(apiService.getTransactions).mockResolvedValue({
        error: undefined,
        data: mockPaginatedResponse,
        statusCode: 200,
        message: 'Success',
        traceId: 'test-trace-id'
      });

      const response = await transactionService.listTransactions();

      expect(response.error).toBeUndefined();
      expect(response.data?.items).toEqual(mockTransactions);
      expect(apiService.getTransactions).toHaveBeenCalled();
    });

    it('should apply filters to transaction list', async () => {
      vi.mocked(apiService.getTransactions).mockResolvedValue({
        error: undefined,
        data: mockPaginatedResponse,
        statusCode: 200,
        message: 'Success',
        traceId: 'test-trace-id'
      });

      const filters: TransactionFilters = {
        type: 'send' as TransactionType,
        search: 'test'
      };

      const response = await transactionService.listTransactions(filters);

      expect(response.error).toBeUndefined();
      expect(response.data?.items).toEqual(mockTransactions);
    });

    it('should handle pagination in transaction list', async () => {
      vi.mocked(apiService.getTransactions).mockResolvedValue({
        error: undefined,
        data: mockPaginatedResponse,
        statusCode: 200,
        message: 'Success',
        traceId: 'test-trace-id'
      });

      const pagination: PaginationRequest = {
        limit: 10,
        cursor: 'cursor-123'
      };

      const response = await transactionService.listTransactions(undefined, pagination);

      expect(response.error).toBeUndefined();
      expect(apiService.getTransactions).toHaveBeenCalledWith(pagination);
    });

    it('should get transaction history (deprecated method)', async () => {
      vi.mocked(apiService.getTransactions).mockResolvedValue({
        error: undefined,
        data: mockPaginatedResponse,
        statusCode: 200,
        message: 'Success',
        traceId: 'test-trace-id'
      });

      const history = await transactionService.getTransactionHistory();

      expect(history).toEqual(mockTransactions);
    });

    it('should handle errors in transaction history', async () => {
      vi.mocked(apiService.getTransactions).mockRejectedValue(new Error('API error'));

      const history = await transactionService.getTransactionHistory();

      expect(history).toEqual([]);
    });
  });

  describe('Transaction Grouping', () => {
    it('should group transactions by date', () => {
      const transactions = [
        { ...mockTransaction, date: '2023-12-25T10:00:00Z' },
        { ...mockTransaction, id: 'tx-124', date: '2023-12-25T15:00:00Z' },
        { ...mockTransaction, id: 'tx-125', date: '2023-12-24T10:00:00Z' },
      ];

      const formatDate = (date: string) => new Date(date).toDateString();
      const grouped = transactionService.groupTransactionsByDate(transactions, formatDate);

      expect(grouped).toHaveLength(2);
      expect(grouped[0].transactions).toHaveLength(2); // Same date
      expect(grouped[1].transactions).toHaveLength(1); // Different date
    });

    it('should sort groups by date (newest first)', () => {
      const transactions = [
        { ...mockTransaction, date: '2023-12-24T10:00:00Z' },
        { ...mockTransaction, id: 'tx-124', date: '2023-12-25T10:00:00Z' },
      ];

      const formatDate = (date: string) => new Date(date).toDateString();
      const grouped = transactionService.groupTransactionsByDate(transactions, formatDate);

      expect(grouped[0].date).toBe('2023-12-25T10:00:00Z'); // Newer date first
      expect(grouped[1].date).toBe('2023-12-24T10:00:00Z');
    });
  });

 

  describe('Cashout API Methods', () => {
    it('should get cashout options successfully', async () => {
      const mockOptions = CASH_OUT_METHODS;
      vi.mocked(httpClient.get).mockResolvedValue({
        error: null,
        data: mockOptions,
        status: 200
      });

      const response = await transactionService.getCashoutOptions();

      expect(response.error).toBeNull();
      expect(response.data).toEqual(mockOptions);
      expect(httpClient.get).toHaveBeenCalledWith('/api/cashout/options');
    });

    it('should get cashout options with location', async () => {
      const mockOptions = CASH_OUT_METHODS;
      vi.mocked(httpClient.get).mockResolvedValue({
        error: null,
        data: mockOptions,
        status: 200
      });

      const response = await transactionService.getCashoutOptions('New York');

      expect(response.error).toBeNull();
      expect(httpClient.get).toHaveBeenCalledWith('/api/cashout/options?location=New%20York');
    });

    it('should initiate cashout successfully', async () => {
      const mockResponse = { reference: 'CASH-123', status: 'pending' };
      vi.mocked(httpClient.post).mockResolvedValue({
        error: null,
        data: mockResponse,
        status: 200
      });

      const payload = {
        fromAccount: 'acc-1',
        toAccount: 'acc-2',
        amount: 100,
        currency: 'USD'
      };

      const response = await transactionService.initiateCashout(payload);

      expect(response.error).toBeNull();
      expect(response.data).toEqual(mockResponse);
      expect(httpClient.post).toHaveBeenCalledWith('/api/cashout/initiate', payload);
    });

    it('should handle invalid cashout parameters', async () => {
      const response = await transactionService.initiateCashout({
        fromAccount: '',
        toAccount: 'acc-2',
        amount: 0,
        currency: 'USD'
      });

      expect(response.error).toBeDefined();
      expect(response.errorCode).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('should cancel cashout successfully', async () => {
      vi.mocked(httpClient.delete).mockResolvedValue({
        error: null,
        data: undefined,
        status: 200
      });

      const response = await transactionService.cancelCashout('tx-123');

      expect(response.error).toBeNull();
      expect(httpClient.delete).toHaveBeenCalledWith('/api/cashout/tx-123');
    });

    it('should handle missing transaction ID in cancel cashout', async () => {
      const response = await transactionService.cancelCashout('');

      expect(response.error).toBeDefined();
      expect(response.errorCode).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('should list cashouts successfully', async () => {
      const mockCashouts = {
        items: [{ reference: 'CASH-123', status: 'completed' }],
        nextCursor: null
      };
      vi.mocked(httpClient.get).mockResolvedValue({
        error: null,
        data: mockCashouts,
        status: 200
      });

      const response = await transactionService.listCashouts();

      expect(response.error).toBeNull();
      expect(response.data).toEqual(mockCashouts);
      expect(httpClient.get).toHaveBeenCalledWith('/api/cashout?');
    });

    it('should list cashouts with filters and pagination', async () => {
      const mockCashouts = {
        items: [{ reference: 'CASH-123', status: 'completed' }],
        nextCursor: null
      };
      vi.mocked(httpClient.get).mockResolvedValue({
        error: null,
        data: mockCashouts,
        status: 200
      });

      const filters = { status: 'completed' };
      const pagination = { limit: 10, cursor: 'cursor-123' };

      const response = await transactionService.listCashouts(filters, pagination);

      expect(response.error).toBeNull();
      expect(httpClient.get).toHaveBeenCalledWith('/api/cashout?status=completed&limit=10&cursor=cursor-123');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(httpClient.get).mockRejectedValue(new Error('Network error'));

      const response = await transactionService.getTransactionById('tx-123');

      expect(response.error).toBeDefined();
      expect(response.errorCode).toBe(ErrorCode.UNKNOWN);
    });

    it('should handle API timeout errors', async () => {
      vi.mocked(apiService.sendMoney).mockRejectedValue(new Error('Timeout'));

      const result = await transactionService.sendMoney(mockContact, 100, 200);

      expect(result.success).toBe(false);
      expect(result.error).toBe(TransactionError.TRANSACTION_FAILED);
    });

    it('should handle malformed API responses', async () => {
      vi.mocked(apiService.getTransactions).mockResolvedValue({
        error: undefined,
        data: undefined,
        statusCode: 200,
        message: 'Success',
        traceId: 'test-trace-id'
      });

      const response = await transactionService.listTransactions();

      expect(response.error).toBeUndefined();
    });

    it('should handle very large amounts in calculations', () => {
      const largeAmount = 999999999.99;
      const fee = transactionService.calculateFee(largeAmount, 1.5);
      const total = transactionService.calculateTotal(largeAmount, 1.5);

      expect(fee).toBe('15000000.00');
      expect(total).toBe('1014999999.99');
    });

    it('should handle very small amounts in calculations', () => {
      const smallAmount = 0.01;
      const fee = transactionService.calculateFee(smallAmount, 1.5);
      const total = transactionService.calculateTotal(smallAmount, 1.5);

      expect(fee).toBe('0.00');
      expect(total).toBe('0.01');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple transaction operations concurrently', async () => {
      vi.mocked(apiService.sendMoney).mockResolvedValue({
        error: undefined,
        data: mockTransaction,
        statusCode: 200,
        message: 'Success',
        traceId: 'test-trace-id'
      });
      vi.mocked(apiService.getTransactions).mockResolvedValue({
        error: undefined,
        data: { 
          items: [mockTransaction],
          total: 1,
          page: 1,
          limit: 10,
          pages: 1
        },
        statusCode: 200,
        message: 'Success',
        traceId: 'test-trace-id'
      });
      vi.mocked(httpClient.get).mockResolvedValue({
        error: null,
        data: mockTransaction,
        status: 200
      });

      const operations = [
        transactionService.sendMoney(mockContact, 50, 200),
        transactionService.listTransactions(),
        transactionService.getTransactionById('tx-123'),
        transactionService.getTransactionHistory(),
      ];

      const results = await Promise.allSettled(operations);

      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(['fulfilled', 'rejected'].includes(result.status)).toBe(true);
      });
    });

    it('should handle rapid QR generation requests', () => {
      const qrRequests = Array.from({ length: 10 }, (_, i) => 
        transactionService.generatePaymentQR(`user-${i}`)
      );

      expect(qrRequests).toHaveLength(10);
      qrRequests.forEach((qr, index) => {
        expect(qr.qrData.userId).toBe(`user-${index}`);
        expect(qr.qrString).toBe(JSON.stringify(qr.qrData));
      });
    });
  });
}); 