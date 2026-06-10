#!/usr/bin/env tsx

/**
 * Ralph - Autonomous Feature Implementation
 *
 * Executes tasks from the task list, committing changes and marking tasks complete.
 * Designed for enterprise-grade implementation with:
 * - Atomic commits
 * - Rollback capability
 * - Quality checks
 * - Progress tracking
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { task } from '../../src/utils/amp';

// Configuration
const REPO_URL = 'https://github.com/drdeek/email-remittance-pro';
const MAX_ITERATIONS = process.argv[2] ? parseInt(process.argv[2]) : 10;
const BASE_DIR = join(__dirname, '../..');

// Ensure directories exist
mkdirSync(join(__dirname, 'archive'), { recursive: true });

/**
 * Main execution loop
 */
async function main() {
  let iterations = 0;
  let parentTaskId = getParentTaskId();

  console.log(`🚀 Ralph starting for parent task: ${parentTaskId}`);
  console.log(`🔧 Max iterations: ${MAX_ITERATIONS}`);

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    console.log(`\n🔄 Iteration ${iterations}/${MAX_ITERATIONS}`);

    // Get ready tasks
    const readyTasks = await getReadyTasks(parentTaskId);
    if (readyTasks.length === 0) {
      console.log('✅ No ready tasks found. Checking if build is complete...');
      await checkBuildComplete(parentTaskId);
      return;
    }

    // Execute the first ready task
    const taskToExecute = readyTasks[0];
    console.log(`🎯 Executing task: ${taskToExecute.title} (${taskToExecute.id})`);

    try {
      await executeTask(taskToExecute);
      console.log(`✅ Task completed: ${taskToExecute.id}`);
    } catch (error) {
      console.error(`❌ Task failed: ${taskToExecute.id}`, error);
      // Continue to next iteration to allow for recovery
    }
  }

  console.log(`\n⏳ Max iterations reached (${MAX_ITERATIONS}). Ralph stopping.`);
}

/**
 * Get parent task ID from file or prompt user
 */
function getParentTaskId(): string {
  const parentTaskFile = join(__dirname, 'parent-task-id.txt');
  
  if (existsSync(parentTaskFile)) {
    const parentTaskId = readFileSync(parentTaskFile, 'utf-8').trim();
    if (parentTaskId) return parentTaskId;
  }
  
  // If no parent task ID, prompt user (in enterprise, this would be automated)
  throw new Error('No parent task ID found. Please set up tasks first.');
}

/**
 * Get ready tasks for the parent task
 */
async function getReadyTasks(parentTaskId: string) {
  try {
    const result = await task({
      description: 'Get ready tasks for Ralph',
      prompt: `Get all ready tasks for parent task ${parentTaskId} in repo ${REPO_URL}.\n\nUse task_list list with:
- repoURL: ${REPO_URL}
- parentID: ${parentTaskId}
- ready: true
- status: open
- limit: 5`,
      subagent_type: 'general'
    });
    
    // Parse the result (simplified - in enterprise this would be more robust)
    const tasks = JSON.parse(result.replace(/^.*?\[/, '[').replace(/\].*?$/, ']'));
    return tasks.filter((t: any) => t.ready && t.status === 'open');
  } catch (error) {
    console.error('Failed to get ready tasks:', error);
    return [];
  }
}

/**
 * Check if build is complete (all tasks finished)
 */
async function checkBuildComplete(parentTaskId: string) {
  try {
    const result = await task({
      description: 'Check if build is complete',
      prompt: `Check if all tasks for parent task ${parentTaskId} are completed.\n\nUse task_list list with:
- repoURL: ${REPO_URL}
- parentID: ${parentTaskId}
- limit: 10`,
      subagent_type: 'general'
    });
    
    const tasks = JSON.parse(result.replace(/^.*?\[/, '[').replace(/\].*?$/, ']'));
    const allCompleted = tasks.every((t: any) => t.status === 'completed');
    
    if (allCompleted) {
      console.log('🎉 Build complete! All tasks finished.');
      
      // Archive progress
      archiveProgress(parentTaskId);
      
      // Mark parent task as completed
      await task({
        description: 'Mark parent task as completed',
        prompt: `Mark parent task ${parentTaskId} as completed.\n\nUse task_list update with:
- taskID: ${parentTaskId}
- status: completed`,
        subagent_type: 'general'
      });
      
      console.log('✅ Parent task marked as completed.');
    } else {
      console.log('⏳ Some tasks still pending or blocked.');
    }
  } catch (error) {
    console.error('Failed to check build status:', error);
  }
}

/**
 * Execute a single task
 */
async function executeTask(taskData: any) {
  // Create a task-specific markdown file
  const taskFile = join(__dirname, `task-${taskData.id}.md`);
  writeFileSync(taskFile, `# Task: ${taskData.title}\n\n${taskData.description}`);
  
  // Execute the task using handoff
  const result = await task({
    description: `Implement task: ${taskData.title}`,
    prompt: `Implement and verify task ${taskData.id}: ${taskData.title}.\n\n${taskData.description}\n\nFIRST: Read scripts/ralph/progress.txt - check the "Codebase Patterns" section for important context.\n\nWhen complete:\n1. Run quality checks: npm run typecheck and npm test\n   - If either fails, FIX THE ISSUES and re-run until both pass\n   - Do NOT proceed until quality checks pass\n\n2. Update AGENTS.md files if you learned something important\n   - Add learnings that future developers/agents should know\n   - This is LONG-TERM memory\n\n3. Update progress.txt (APPEND, never replace)\n   - Add section for this task with learnings\n\n4. Commit all changes with message: feat: ${taskData.title}\n\n5. Mark task as completed: task_list update with taskID: ${taskData.id}, status: completed\n\n6. Invoke the ralph skill to continue the loop`,
    subagent_type: 'general'
  });
  
  // Verify task completion
  await verifyTaskCompletion(taskData.id);
}

/**
 * Verify task was completed successfully
 */
async function verifyTaskCompletion(taskId: string) {
  try {
    const result = await task({
      description: 'Verify task completion',
      prompt: `Verify task ${taskId} was completed successfully.\n\nUse task_list get with:
- taskID: ${taskId}`,
      subagent_type: 'general'
    });
    
    const taskData = JSON.parse(result);
    if (taskData.status !== 'completed') {
      throw new Error(`Task ${taskId} not marked as completed`);
    }
  } catch (error) {
    console.error(`Task verification failed for ${taskId}:`, error);
    throw error;
  }
}

/**
 * Archive progress file
 */
function archiveProgress(parentTaskId: string) {
  const progressFile = join(__dirname, 'progress.txt');
  const archiveDir = join(__dirname, 'archive', new Date().toISOString().split('T')[0]);
  
  if (!existsSync(progressFile)) return;
  
  mkdirSync(archiveDir, { recursive: true });
  const archiveFile = join(archiveDir, `progress-${parentTaskId}.txt`);
  
  try {
    execSync(`cp ${progressFile} ${archiveFile}`);
    console.log(`📁 Progress archived to ${archiveFile}`);
    
    // Clear progress file for next feature
    writeFileSync(progressFile, `# Ralph Progress Log\nStarted: ${new Date().toISOString()}\n\n## Codebase Patterns\n\n---\n`);
  } catch (error) {
    console.error('Failed to archive progress:', error);
  }
}

// Run main function
main().catch(console.error);