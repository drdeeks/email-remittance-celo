/**
 * Monitoring Utilities
 * 
 * Enterprise-grade monitoring with:
 * - Metrics collection
 * - Alerting
 * - Performance tracking
 */

import { logger } from './logger';
import { selfConfig } from '../config/self';

interface Metric {
  type: 'Counter' | 'Gauge' | 'Histogram';
  value: number;
  labels?: Record<string, string>;
  description: string;
}

class Monitoring {
  private metrics: Record<string, Metric>;
  private alerts: Record<string, { count: number; lastTriggered: number }>;

  constructor() {
    this.metrics = {};
    this.alerts = {};
    
    // Initialize default metrics
    this.registerMetric('system_uptime', 'Gauge', 'System uptime in seconds');
    this.registerMetric('system_errors_total', 'Counter', 'Total system errors');
  }

  /**
   * Register a new metric
   */
  registerMetric(name: string, type: 'Counter' | 'Gauge' | 'Histogram', description: string) {
    this.metrics[name] = {
      type,
      value: 0,
      description,
    };
    logger.info(`Registered metric: ${name} (${type})`);
  }

  /**
   * Increment a counter metric
   */
  incrementMetric(name: string, labels?: Record<string, string>) {
    if (!this.metrics[name]) {
      this.registerMetric(name, 'Counter', `Auto-registered counter: ${name}`);
    }
    
    if (this.metrics[name].type !== 'Counter') {
      logger.warn(`Metric ${name} is not a Counter`);
      return;
    }
    
    this.metrics[name].value++;
    if (labels) {
      this.metrics[name].labels = labels;
    }
  }

  /**
   * Record a value for a gauge or histogram metric
   */
  recordMetric(name: string, value: number, labels?: Record<string, string>) {
    if (!this.metrics[name]) {
      this.registerMetric(name, 'Gauge', `Auto-registered gauge: ${name}`);
    }
    
    this.metrics[name].value = value;
    if (labels) {
      this.metrics[name].labels = labels;
    }
  }

  /**
   * Get metric value
   */
  getMetric(name: string): number {
    return this.metrics[name]?.value || 0;
  }

  /**
   * Get all metrics
   */
  getMetrics(): Record<string, Metric> {
    return { ...this.metrics };
  }

  /**
   * Trigger an alert
   */
  triggerAlert(name: string, context: Record<string, any> = {}) {
    if (!selfConfig.monitoring.enabled) return;
    
    const now = Date.now();
    const alertThreshold = selfConfig.monitoring.alertThreshold;
    
    // Initialize alert tracking if not exists
    if (!this.alerts[name]) {
      this.alerts[name] = { count: 0, lastTriggered: 0 };
    }
    
    // Check if alert should be triggered
    const alert = this.alerts[name];
    alert.count++;
    
    if (alert.count >= alertThreshold && now - alert.lastTriggered > 3600000) { // 1 hour cooldown
      alert.lastTriggered = now;
      
      // Log the alert
      logger.alert(`ALERT: ${name}`, {
        ...context,
        count: alert.count,
        timestamp: new Date().toISOString(),
      });
      
      // In a real implementation, this would send to an alerting system
      // like PagerDuty, Opsgenie, or Slack
      this.sendAlertToMonitoringSystem(name, context);
    }
  }

  private sendAlertToMonitoringSystem(name: string, context: Record<string, any>) {
    // Placeholder for actual alerting integration
    logger.warn(`Alert triggered: ${name}`, context);
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      metrics: Object.keys(this.metrics).length,
      alerts: Object.keys(this.alerts).length,
      enabled: selfConfig.monitoring.enabled,
    };
  }
}

export const monitoring = new Monitoring();