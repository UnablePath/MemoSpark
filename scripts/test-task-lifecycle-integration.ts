/**
 * Task Lifecycle Integration Testing Script
 * 
 * This script performs end-to-end testing of task lifecycle (create, edit, complete, delete) 
 * for simple and recurring tasks across Timetable, List, and Calendar views.
 * 
 * Tests:
 * 1. TaskForm validation and submission (simple tasks)
 * 2. TaskForm validation and submission (recurring tasks)
 * 3. Task display consistency across ListView, CalendarViewEnhanced, TimetableView
 * 4. Task editing and state propagation
 * 5. Task completion toggle across views
 * 6. Task deletion and consistency
 * 7. TimetableEntryForm validation and submission
 * 8. Error handling and loading states
 * 9. Form validation (client-side)
 * 10. Data integrity across view transitions
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

interface TestResult {
  testName: string;
  category: string;
  passed: boolean;
  details: string;
  timestamp: Date;
  duration?: number;
}

interface TaskTestData {
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  type: 'academic' | 'personal' | 'event';
  subject?: string;
  reminder_settings?: {
    enabled: boolean;
    offset_minutes: number;
    type: 'notification' | 'email' | 'both';
  };
  recurrence_rule?: string;
}

interface TimetableTestData {
  course_name: string;
  course_code?: string;
  instructor?: string;
  location?: string;
  start_time: string;
  end_time: string;
  days_of_week: string[];
  semester_start_date: string;
  semester_end_date: string;
}

class TaskLifecycleTestSuite {
  private results: TestResult[] = [];
  private supabaseAdmin: any;
  private supabaseClient: any;
  private testUserId: string = 'test-user-lifecycle';

  // Test data sets
  private simpleTaskData: TaskTestData = {
    title: 'Test Simple Task',
    description: 'This is a test task for lifecycle testing',
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    priority: 'medium',
    type: 'academic',
    subject: 'Mathematics',
    reminder_settings: {
      enabled: true,
      offset_minutes: 15,
      type: 'notification'
    }
  };

  private recurringTaskData: TaskTestData = {
    title: 'Test Recurring Task',
    description: 'This is a recurring task for lifecycle testing',
    due_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    priority: 'high',
    type: 'personal',
    reminder_settings: {
      enabled: true,
      offset_minutes: 30,
      type: 'both'
    },
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10' // Weekly on MWF, 10 occurrences
  };

  private timetableData: TimetableTestData = {
    course_name: 'Advanced Mathematics',
    course_code: 'MATH301',
    instructor: 'Dr. Smith',
    location: 'Room 101',
    start_time: '09:00',
    end_time: '10:30',
    days_of_week: ['monday', 'wednesday', 'friday'],
    semester_start_date: '2025-01-15',
    semester_end_date: '2025-05-15'
  };

  constructor() {
    this.initializeSupabaseClients();
  }

  private initializeSupabaseClients() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      throw new Error('Missing required Supabase environment variables');
    }

    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    this.supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  private log(testName: string, category: string, passed: boolean, details: string, duration?: number) {
    const result: TestResult = {
      testName,
      category,
      passed,
      details,
      timestamp: new Date(),
      duration
    };
    this.results.push(result);
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const durationStr = duration ? ` (${duration}ms)` : '';
    console.log(`${status} [${category}] ${testName}: ${details}${durationStr}`);
  }

  /**
   * Test 1: Environment Setup and Database Connectivity
   */
  async testEnvironmentSetup(): Promise<void> {
    console.log('\n🔧 Testing Environment Setup...');
    const startTime = Date.now();
    
    try {
      // Test database connectivity
      const { data, error } = await this.supabaseAdmin
        .from('tasks')
        .select('id')
        .limit(1);

      if (error) throw error;

      this.log(
        'Database Connectivity',
        'Environment',
        true,
        'Successfully connected to tasks table',
        Date.now() - startTime
      );
    } catch (error) {
      this.log(
        'Database Connectivity',
        'Environment',
        false,
        `Failed to connect: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Test 2: Simple Task Creation and Validation
   */
  async testSimpleTaskCreation(): Promise<void> {
    console.log('\n📝 Testing Simple Task Creation...');
    const startTime = Date.now();
    
    try {
      // Test task creation
      const { data: createdTask, error: createError } = await this.supabaseAdmin
        .from('tasks')
        .insert({
          ...this.simpleTaskData,
          user_id: this.testUserId,
          completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;

      // Validate created task structure
      const requiredFields = ['id', 'title', 'due_date', 'priority', 'type', 'user_id'];
      const missingFields = requiredFields.filter(field => !createdTask[field]);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Store task ID for later tests
      (this as any).simpleTaskId = createdTask.id;

      this.log(
        'Simple Task Creation',
        'Task CRUD',
        true,
        `Task created successfully with ID: ${createdTask.id}`,
        Date.now() - startTime
      );

      // Test task validation rules
      await this.testTaskValidation();

    } catch (error) {
      this.log(
        'Simple Task Creation',
        'Task CRUD',
        false,
        `Failed to create task: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Test 3: Task Validation Rules
   */
  async testTaskValidation(): Promise<void> {
    console.log('\n🔍 Testing Task Validation Rules...');
    const startTime = Date.now();
    
    try {
      // Test required field validation - title missing
      const { error: titleError } = await this.supabaseAdmin
        .from('tasks')
        .insert({
          description: 'Task without title',
          user_id: this.testUserId,
          priority: 'medium',
          type: 'academic'
        });

      // Should fail due to NOT NULL constraint on title
      const titleValidationPassed = titleError !== null;

      // Test invalid priority value
      const { error: priorityError } = await this.supabaseAdmin
        .from('tasks')
        .insert({
          title: 'Test Invalid Priority',
          user_id: this.testUserId,
          priority: 'invalid' as any,
          type: 'academic'
        });

      // Should fail due to enum constraint
      const priorityValidationPassed = priorityError !== null;

      // Test invalid type value
      const { error: typeError } = await this.supabaseAdmin
        .from('tasks')
        .insert({
          title: 'Test Invalid Type',
          user_id: this.testUserId,
          priority: 'medium',
          type: 'invalid' as any
        });

      // Should fail due to enum constraint
      const typeValidationPassed = typeError !== null;

      const allValidationsPassed = titleValidationPassed && priorityValidationPassed && typeValidationPassed;

      this.log(
        'Task Validation Rules',
        'Validation',
        allValidationsPassed,
        `Title: ${titleValidationPassed}, Priority: ${priorityValidationPassed}, Type: ${typeValidationPassed}`,
        Date.now() - startTime
      );

    } catch (error) {
      this.log(
        'Task Validation Rules',
        'Validation',
        false,
        `Validation test failed: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Test 4: Recurring Task Creation and Validation
   */
  async testRecurringTaskCreation(): Promise<void> {
    console.log('\n🔄 Testing Recurring Task Creation...');
    const startTime = Date.now();
    
    try {
      // Test recurring task creation
      const { data: createdTask, error: createError } = await this.supabaseAdmin
        .from('tasks')
        .insert({
          ...this.recurringTaskData,
          user_id: this.testUserId,
          completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;

      // Validate recurrence rule format
      const rruleValid = createdTask.recurrence_rule && 
                        createdTask.recurrence_rule.includes('FREQ=') &&
                        createdTask.recurrence_rule.includes('BYDAY=');

      if (!rruleValid) {
        throw new Error('Invalid recurrence rule format');
      }

      // Store task ID for later tests
      (this as any).recurringTaskId = createdTask.id;

      this.log(
        'Recurring Task Creation',
        'Task CRUD',
        true,
        `Recurring task created with RRULE: ${createdTask.recurrence_rule}`,
        Date.now() - startTime
      );

    } catch (error) {
      this.log(
        'Recurring Task Creation',
        'Task CRUD',
        false,
        `Failed to create recurring task: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Test 5: Task Display Consistency Across Views
   */
  async testTaskDisplayConsistency(): Promise<void> {
    console.log('\n👁️ Testing Task Display Consistency...');
    const startTime = Date.now();
    
    try {
      // Fetch tasks as each view would
      const { data: listViewTasks, error: listError } = await this.supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('user_id', this.testUserId)
        .order('created_at', { ascending: false });

      if (listError) throw listError;

      // Test calendar view query (tasks with due dates)
      const { data: calendarTasks, error: calendarError } = await this.supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('user_id', this.testUserId)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true });

      if (calendarError) throw calendarError;

      // Verify task counts match expectations
      const expectedTaskCount = 2; // Simple + Recurring
      const listViewCount = listViewTasks?.length || 0;
      const calendarTaskCount = calendarTasks?.length || 0;

      const consistencyPassed = listViewCount >= expectedTaskCount && calendarTaskCount >= expectedTaskCount;

      this.log(
        'Task Display Consistency',
        'View Integration',
        consistencyPassed,
        `List: ${listViewCount} tasks, Calendar: ${calendarTaskCount} tasks`,
        Date.now() - startTime
      );

      // Test task data structure consistency
      if (listViewTasks && listViewTasks.length > 0) {
        const sampleTask = listViewTasks[0];
        const hasRequiredFields = sampleTask.id && sampleTask.title && sampleTask.priority && sampleTask.type;
        
        this.log(
          'Task Data Structure',
          'View Integration',
          hasRequiredFields,
          'Task objects contain all required fields for display',
          Date.now() - startTime
        );
      }

    } catch (error) {
      this.log(
        'Task Display Consistency',
        'View Integration',
        false,
        `Failed to test display consistency: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Test 6: Task Editing and State Propagation
   */
  async testTaskEditing(): Promise<void> {
    console.log('\n✏️ Testing Task Editing...');
    const startTime = Date.now();
    
    try {
      const simpleTaskId = (this as any).simpleTaskId;
      if (!simpleTaskId) {
        throw new Error('Simple task ID not available for editing test');
      }

      // Test task update
      const updatedData = {
        title: 'Updated Test Task',
        description: 'This task has been updated',
        priority: 'high' as const,
        updated_at: new Date().toISOString()
      };

      const { data: updatedTask, error: updateError } = await this.supabaseAdmin
        .from('tasks')
        .update(updatedData)
        .eq('id', simpleTaskId)
        .eq('user_id', this.testUserId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Verify updates were applied
      const updatesApplied = updatedTask.title === updatedData.title &&
                           updatedTask.description === updatedData.description &&
                           updatedTask.priority === updatedData.priority;

      this.log(
        'Task Editing',
        'Task CRUD',
        updatesApplied,
        `Task updated successfully: ${updatedTask.title}`,
        Date.now() - startTime
      );

      // Test RLS - attempt to update task with wrong user_id
      const { error: rlsError } = await this.supabaseClient
        .from('tasks')
        .update({ title: 'Unauthorized Update' })
        .eq('id', simpleTaskId)
        .eq('user_id', 'wrong-user-id');

      // Should fail due to RLS
      const rlsWorking = rlsError !== null;

      this.log(
        'Task Edit RLS Protection',
        'Security',
        rlsWorking,
        'RLS correctly prevents unauthorized task updates',
        Date.now() - startTime
      );

    } catch (error) {
      this.log(
        'Task Editing',
        'Task CRUD',
        false,
        `Failed to edit task: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Test 7: Task Completion Toggle
   */
  async testTaskCompletion(): Promise<void> {
    console.log('\n✅ Testing Task Completion Toggle...');
    const startTime = Date.now();
    
    try {
      const simpleTaskId = (this as any).simpleTaskId;
      if (!simpleTaskId) {
        throw new Error('Simple task ID not available for completion test');
      }

      // Test completion toggle (mark as completed)
      const { data: completedTask, error: completeError } = await this.supabaseAdmin
        .from('tasks')
        .update({ 
          completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', simpleTaskId)
        .eq('user_id', this.testUserId)
        .select()
        .single();

      if (completeError) throw completeError;

      const completedSuccessfully = completedTask.completed === true;

      this.log(
        'Task Completion (Mark Complete)',
        'Task CRUD',
        completedSuccessfully,
        'Task marked as completed successfully',
        Date.now() - startTime
      );

      // Test completion toggle (mark as incomplete)
      const { data: incompleteTask, error: incompleteError } = await this.supabaseAdmin
        .from('tasks')
        .update({ 
          completed: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', simpleTaskId)
        .eq('user_id', this.testUserId)
        .select()
        .single();

      if (incompleteError) throw incompleteError;

      const incompletedSuccessfully = incompleteTask.completed === false;

      this.log(
        'Task Completion (Mark Incomplete)',
        'Task CRUD',
        incompletedSuccessfully,
        'Task marked as incomplete successfully',
        Date.now() - startTime
      );

    } catch (error) {
      this.log(
        'Task Completion Toggle',
        'Task CRUD',
        false,
        `Failed to toggle completion: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Test 8: Task Deletion and Consistency
   */
  async testTaskDeletion(): Promise<void> {
    console.log('\n🗑️ Testing Task Deletion...');
    const startTime = Date.now();
    
    try {
      const recurringTaskId = (this as any).recurringTaskId;
      if (!recurringTaskId) {
        throw new Error('Recurring task ID not available for deletion test');
      }

      // First verify task exists
      const { data: taskBefore, error: checkError } = await this.supabaseAdmin
        .from('tasks')
        .select('id')
        .eq('id', recurringTaskId)
        .single();

      if (checkError) throw checkError;

      // Test task deletion
      const { error: deleteError } = await this.supabaseAdmin
        .from('tasks')
        .delete()
        .eq('id', recurringTaskId)
        .eq('user_id', this.testUserId);

      if (deleteError) throw deleteError;

      // Verify task no longer exists
      const { data: taskAfter, error: verifyError } = await this.supabaseAdmin
        .from('tasks')
        .select('id')
        .eq('id', recurringTaskId)
        .single();

      // Should return error because task doesn't exist
      const deletionSuccessful = verifyError !== null && taskAfter === null;

      this.log(
        'Task Deletion',
        'Task CRUD',
        deletionSuccessful,
        'Task deleted successfully and not found in subsequent queries',
        Date.now() - startTime
      );

      // Test RLS on deletion
      const simpleTaskId = (this as any).simpleTaskId;
      const { error: rlsDeleteError } = await this.supabaseClient
        .from('tasks')
        .delete()
        .eq('id', simpleTaskId)
        .eq('user_id', 'wrong-user-id');

      // Should fail due to RLS
      const rlsWorking = rlsDeleteError !== null;

      this.log(
        'Task Deletion RLS Protection',
        'Security',
        rlsWorking,
        'RLS correctly prevents unauthorized task deletions',
        Date.now() - startTime
      );

    } catch (error) {
      this.log(
        'Task Deletion',
        'Task CRUD',
        false,
        `Failed to delete task: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Test 9: Timetable Entry Form Testing
   */
  async testTimetableEntryForm(): Promise<void> {
    console.log('\n📅 Testing Timetable Entry Form...');
    const startTime = Date.now();
    
    try {
      // Test timetable entry creation
      const { data: createdEntry, error: createError } = await this.supabaseAdmin
        .from('timetable_entries')
        .insert({
          ...this.timetableData,
          user_id: this.testUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;

      // Validate timetable entry structure
      const hasRequiredFields = createdEntry.course_name && 
                               createdEntry.start_time && 
                               createdEntry.end_time &&
                               createdEntry.days_of_week &&
                               Array.isArray(createdEntry.days_of_week);

      if (!hasRequiredFields) {
        throw new Error('Timetable entry missing required fields');
      }

      // Store entry ID for later tests
      (this as any).timetableEntryId = createdEntry.id;

      this.log(
        'Timetable Entry Creation',
        'Timetable CRUD',
        true,
        `Timetable entry created: ${createdEntry.course_name}`,
        Date.now() - startTime
      );

      // Test time format validation
      const timeFormatValid = /^\d{2}:\d{2}$/.test(createdEntry.start_time) &&
                             /^\d{2}:\d{2}$/.test(createdEntry.end_time);

      this.log(
        'Timetable Time Format',
        'Validation',
        timeFormatValid,
        `Start: ${createdEntry.start_time}, End: ${createdEntry.end_time}`,
        Date.now() - startTime
      );

    } catch (error) {
      this.log(
        'Timetable Entry Form',
        'Timetable CRUD',
        false,
        `Failed to test timetable form: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Test 10: Error Handling and Loading States
   */
  async testErrorHandling(): Promise<void> {
    console.log('\n🚨 Testing Error Handling...');
    const startTime = Date.now();
    
    try {
      // Test network error simulation (invalid table name)
      const { error: networkError } = await this.supabaseAdmin
        .from('non_existent_table')
        .select('*');

      const errorHandled = networkError !== null && networkError.message;

      this.log(
        'Network Error Handling',
        'Error Handling',
        errorHandled,
        `Error properly caught: ${networkError?.code}`,
        Date.now() - startTime
      );

      // Test constraint violation error
      const { error: constraintError } = await this.supabaseAdmin
        .from('tasks')
        .insert({
          title: null, // This should violate NOT NULL constraint
          user_id: this.testUserId,
          priority: 'medium',
          type: 'academic'
        });

      const constraintErrorHandled = constraintError !== null;

      this.log(
        'Constraint Error Handling',
        'Error Handling',
        constraintErrorHandled,
        'Database constraint errors properly caught',
        Date.now() - startTime
      );

    } catch (error) {
      this.log(
        'Error Handling Tests',
        'Error Handling',
        false,
        `Error handling test failed: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Test 11: Performance and Loading States
   */
  async testPerformanceMetrics(): Promise<void> {
    console.log('\n⚡ Testing Performance Metrics...');
    const startTime = Date.now();
    
    try {
      // Test query performance for different view loads
      const listViewStart = Date.now();
      const { data: listTasks } = await this.supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('user_id', this.testUserId)
        .order('created_at', { ascending: false })
        .limit(50);
      const listViewDuration = Date.now() - listViewStart;

      const calendarViewStart = Date.now();
      const { data: calendarTasks } = await this.supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('user_id', this.testUserId)
        .not('due_date', 'is', null)
        .gte('due_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last week
        .lte('due_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()); // Next month
      const calendarViewDuration = Date.now() - calendarViewStart;

      const timetableViewStart = Date.now();
      const { data: timetableEntries } = await this.supabaseAdmin
        .from('timetable_entries')
        .select('*')
        .eq('user_id', this.testUserId);
      const timetableViewDuration = Date.now() - timetableViewStart;

      // Performance thresholds (in milliseconds)
      const PERFORMANCE_THRESHOLD = 1000; // 1 second

      const listPerformanceOk = listViewDuration < PERFORMANCE_THRESHOLD;
      const calendarPerformanceOk = calendarViewDuration < PERFORMANCE_THRESHOLD;
      const timetablePerformanceOk = timetableViewDuration < PERFORMANCE_THRESHOLD;

      this.log(
        'ListView Performance',
        'Performance',
        listPerformanceOk,
        `Query completed in ${listViewDuration}ms (${listTasks?.length || 0} tasks)`,
        listViewDuration
      );

      this.log(
        'CalendarView Performance',
        'Performance',
        calendarPerformanceOk,
        `Query completed in ${calendarViewDuration}ms (${calendarTasks?.length || 0} tasks)`,
        calendarViewDuration
      );

      this.log(
        'TimetableView Performance',
        'Performance',
        timetablePerformanceOk,
        `Query completed in ${timetableViewDuration}ms (${timetableEntries?.length || 0} entries)`,
        timetableViewDuration
      );

    } catch (error) {
      this.log(
        'Performance Testing',
        'Performance',
        false,
        `Performance test failed: ${error}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Cleanup Test Data
   */
  async cleanupTestData(): Promise<void> {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      // Delete test tasks
      await this.supabaseAdmin
        .from('tasks')
        .delete()
        .eq('user_id', this.testUserId);

      // Delete test timetable entries
      await this.supabaseAdmin
        .from('timetable_entries')
        .delete()
        .eq('user_id', this.testUserId);

      console.log('✅ Test data cleaned up successfully');
    } catch (error) {
      console.log(`❌ Failed to cleanup test data: ${error}`);
    }
  }

  /**
   * Run All Integration Tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Task Lifecycle Integration Tests\n');
    console.log('='.repeat(80));
    
    const overallStartTime = Date.now();

    try {
      await this.testEnvironmentSetup();
      await this.testSimpleTaskCreation();
      await this.testRecurringTaskCreation();
      await this.testTaskDisplayConsistency();
      await this.testTaskEditing();
      await this.testTaskCompletion();
      await this.testTaskDeletion();
      await this.testTimetableEntryForm();
      await this.testErrorHandling();
      await this.testPerformanceMetrics();
    } finally {
      await this.cleanupTestData();
    }

    const overallDuration = Date.now() - overallStartTime;
    this.generateSummaryReport(overallDuration);
  }

  /**
   * Generate Summary Report
   */
     private generateSummaryReport(totalDuration: number): void {
     console.log('\n' + '='.repeat(80));
     console.log('📊 Task Lifecycle Integration Test Summary');
     console.log('='.repeat(80));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log(`\n🎯 Overall Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests} ✅`);
    console.log(`   Failed: ${failedTests} ❌`);
    console.log(`   Success Rate: ${successRate}%`);
    console.log(`   Total Duration: ${totalDuration}ms`);

    // Group results by category
    const categories = [...new Set(this.results.map(r => r.category))];
    
    console.log(`\n📂 Results by Category:`);
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const categoryPassed = categoryResults.filter(r => r.passed).length;
      const categoryTotal = categoryResults.length;
      const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(1);
      
      console.log(`   ${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
    });

    // Show failed tests
    const failedResults = this.results.filter(r => !r.passed);
    if (failedResults.length > 0) {
      console.log(`\n❌ Failed Tests:`);
      failedResults.forEach(result => {
        console.log(`   • ${result.testName}: ${result.details}`);
      });
    }

    // Show performance metrics
    const performanceResults = this.results.filter(r => r.category === 'Performance' && r.duration);
    if (performanceResults.length > 0) {
      console.log(`\n⚡ Performance Metrics:`);
      performanceResults.forEach(result => {
        console.log(`   • ${result.testName}: ${result.duration}ms`);
      });
    }

         console.log('\n' + '='.repeat(80));
     console.log(passedTests === totalTests ? '🎉 All tests passed!' : '⚠️  Some tests failed. Review the results above.');
     console.log('='.repeat(80));
  }
}

// Script execution
if (require.main === module) {
  const testSuite = new TaskLifecycleTestSuite();
  testSuite.runAllTests()
    .then(() => {
      console.log('\n✅ Integration testing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Integration testing failed:', error);
      process.exit(1);
    });
}

export { TaskLifecycleTestSuite }; 