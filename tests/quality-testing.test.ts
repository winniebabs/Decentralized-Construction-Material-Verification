import { describe, it, expect, beforeEach } from 'vitest';

// Mock implementation for testing Clarity contracts
const mockContractState = {
  testResults: new Map(),
  authorizedLabs: new Map(),
  admin: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  currentUser: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'
};

// Mock contract functions
const qualityTesting = {
  addTestingLab: (labPrincipal, name) => {
    mockContractState.authorizedLabs.set(labPrincipal, {
      name,
      isActive: true
    });
    
    return { type: 'ok', value: true };
  },
  
  deactivateLab: (labPrincipal) => {
    if (!mockContractState.authorizedLabs.has(labPrincipal)) {
      return { type: 'err', value: 404 };
    }
    
    const lab = mockContractState.authorizedLabs.get(labPrincipal);
    lab.isActive = false;
    mockContractState.authorizedLabs.set(labPrincipal, lab);
    
    return { type: 'ok', value: true };
  },
  
  recordTestResult: (testId, batchId, result, parameters) => {
    if (mockContractState.testResults.has(testId)) {
      return { type: 'err', value: 100 };
    }
    
    if (!mockContractState.authorizedLabs.has(mockContractState.currentUser)) {
      return { type: 'err', value: 401 };
    }
    
    if (!mockContractState.authorizedLabs.get(mockContractState.currentUser).isActive) {
      return { type: 'err', value: 403 };
    }
    
    if (result < 0 || result > 2) {
      return { type: 'err', value: 400 };
    }
    
    mockContractState.testResults.set(testId, {
      batchId,
      labPrincipal: mockContractState.currentUser,
      testDate: 123, // Mock block height
      result,
      parameters
    });
    
    return { type: 'ok', value: true };
  },
  
  getTestResult: (testId) => {
    if (!mockContractState.testResults.has(testId)) {
      return null;
    }
    
    return mockContractState.testResults.get(testId);
  },
  
  isBatchPassed: (batchId, testId) => {
    if (!mockContractState.testResults.has(testId)) {
      return false;
    }
    
    const test = mockContractState.testResults.get(testId);
    return test.batchId === batchId && test.result === 1;
  }
};

describe('Quality Testing Contract', () => {
  beforeEach(() => {
    // Reset the mock state before each test
    mockContractState.testResults.clear();
    mockContractState.authorizedLabs.clear();
    mockContractState.currentUser = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  });
  
  it('should add a testing lab', () => {
    const result = qualityTesting.addTestingLab('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG', 'Quality Labs Inc');
    expect(result.type).toBe('ok');
    expect(mockContractState.authorizedLabs.has('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG')).toBe(true);
  });
  
  it('should deactivate a lab', () => {
    qualityTesting.addTestingLab('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG', 'Quality Labs Inc');
    const result = qualityTesting.deactivateLab('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG');
    expect(result.type).toBe('ok');
    expect(mockContractState.authorizedLabs.get('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG').isActive).toBe(false);
  });
  
  it('should not deactivate a non-existent lab', () => {
    const result = qualityTesting.deactivateLab('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG');
    expect(result.type).toBe('err');
    expect(result.value).toBe(404);
  });
  
  it('should record test results from authorized labs', () => {
    // Add the current user as an authorized lab
    qualityTesting.addTestingLab(mockContractState.currentUser, 'Current Lab');
    
    const result = qualityTesting.recordTestResult('TEST123', 'BATCH456', 1, 'Compression strength: 50MPa');
    expect(result.type).toBe('ok');
    expect(mockContractState.testResults.has('TEST123')).toBe(true);
    expect(mockContractState.testResults.get('TEST123').result).toBe(1);
  });
  
  it('should not record test results from unauthorized labs', () => {
    mockContractState.currentUser = 'ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5YC7WF3G8';
    
    const result = qualityTesting.recordTestResult('TEST123', 'BATCH456', 1, 'Compression strength: 50MPa');
    expect(result.type).toBe('err');
    expect(result.value).toBe(401);
  });
  
  it('should not record test results from deactivated labs', () => {
    // Add the current user as an authorized lab
    qualityTesting.addTestingLab(mockContractState.currentUser, 'Current Lab');
    // Then deactivate it
    qualityTesting.deactivateLab(mockContractState.currentUser);
    
    const result = qualityTesting.recordTestResult('TEST123', 'BATCH456', 1, 'Compression strength: 50MPa');
    expect(result.type).toBe('err');
    expect(result.value).toBe(403);
  });
  
  it('should correctly identify passed batches', () => {
    qualityTesting.addTestingLab(mockContractState.currentUser, 'Current Lab');
    qualityTesting.recordTestResult('TEST123', 'BATCH456', 1, 'Passed all tests');
    qualityTesting.recordTestResult('TEST789', 'BATCH456', 2, 'Failed strength test');
    
    expect(qualityTesting.isBatchPassed('BATCH456', 'TEST123')).toBe(true);
    expect(qualityTesting.isBatchPassed('BATCH456', 'TEST789')).toBe(false);
  });
  
  it('should retrieve test results', () => {
    qualityTesting.addTestingLab(mockContractState.currentUser, 'Current Lab');
    qualityTesting.recordTestResult('TEST123', 'BATCH456', 1, 'Compression strength: 50MPa');
    
    const testResult = qualityTesting.getTestResult('TEST123');
    expect(testResult).not.toBeNull();
    expect(testResult.batchId).toBe('BATCH456');
    expect(testResult.result).toBe(1);
  });
});
