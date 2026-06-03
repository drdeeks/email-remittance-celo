/**
 * Rollback Utilities
 * 
 * Enterprise-grade rollback capability with:
 * - Transaction logging
 * - Atomic operations
 * - Retry logic
 * - Error recovery
 */

import { logger } from './logger';
import { selfConfig } from '../config/self';

interface RollbackContext {
  [key: string]: any;
}

interface RollbackOperation {
  execute: () => Promise<any>;
  rollback: () => Promise<void>;
  context: RollbackContext;
}

class Rollback {
  private operationStack: RollbackOperation[];

  constructor() {
    this.operationStack = [];
  }

  /**
   * Execute an operation with rollback capability
   */
  async executeWithRollback<T>(operation: () => Promise<T>, options: {
    maxRetries?: number;
    context?: RollbackContext;
  } = {}): Promise<T> {
    const maxRetries = options.maxRetries || selfConfig.rollback.maxRetries;
    const context = options.context || {};
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Execute the operation
        const result = await operation();
        
        // If successful, clear the stack
        this.operationStack = [];
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.error(`Operation failed (attempt ${attempt}/${maxRetries})`, {
          error: lastError.message,
          context,
        });
        
        // Attempt rollback if this isn't the last attempt
        if (attempt < maxRetries) {
          try {
            await this.rollbackAll();
            logger.info('Rollback successful, retrying operation');
          } catch (rollbackError) {
            logger.error('Rollback failed during retry', rollbackError);
            throw new Error(`Operation failed and rollback failed: ${lastError.message}`);
          }
        }
      }
    }
    
    // If we get here, all attempts failed
    throw lastError || new Error('Operation failed after maximum retries');
  }

  /**
   * Register an operation with rollback capability
   */
  registerOperation(operation: RollbackOperation) {
    this.operationStack.push(operation);
  }

  /**
   * Rollback all registered operations
   */
  async rollbackAll() {
    if (this.operationStack.length === 0) {
      logger.info('No operations to rollback');
      return;
    }
    
    logger.info(`Rolling back ${this.operationStack.length} operations`);
    
    // Rollback in reverse order
    for (let i = this.operationStack.length - 1; i >= 0; i--) {
      const operation = this.operationStack[i];
      try {
        await operation.rollback();
        logger.info(`Rollback successful for operation ${i}`, operation.context);
      } catch (error) {
        logger.error(`Rollback failed for operation ${i}`, {
          error: error instanceof Error ? error.message : String(error),
          context: operation.context,
        });
        // Continue with other rollbacks even if one fails
      }
    }
    
    // Clear the stack after rollback
    this.operationStack = [];
  }

  /**
   * Get current rollback stack
   */
  getRollbackStack(): RollbackOperation[] {
    return [...this.operationStack];
  }
}

export const rollback = new Rollback();