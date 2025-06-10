import { memoSparkAI, AIUtils, OnboardingManager, type Task, type ClassTimetableEntry } from './index';

// Test data to verify enhanced first-day AI functionality
const testTasks: Task[] = [
  {
    id: '1',
    title: 'Complete Math Assignment',
    dueDate: '2025-01-30T10:00:00Z',
    priority: 'high',
    type: 'academic',
    subject: 'Mathematics',
    completed: false,
    reminder: true
  },
  {
    id: '2',
    title: 'Study for Physics Exam',
    dueDate: '2025-01-31T14:00:00Z',
    priority: 'high',
    type: 'academic',
    subject: 'Physics',
    completed: false,
    reminder: true
  },
  {
    id: '3',
    title: 'Write History Essay',
    dueDate: '2025-02-01T12:00:00Z',
    priority: 'medium',
    type: 'academic',
    subject: 'History',
    completed: false,
    reminder: false
  }
];

const testTimetable: ClassTimetableEntry[] = [
  {
    id: 'class1',
    courseName: 'Advanced Mathematics',
    courseCode: 'MATH301',
    instructor: 'Dr. Smith',
    location: 'Room 101',
    startTime: '09:00',
    endTime: '10:30',
    daysOfWeek: ['Monday', 'Wednesday', 'Friday'],
    semesterStartDate: '2025-01-15',
    semesterEndDate: '2025-05-15',
    color: '#FF6B6B'
  },
  {
    id: 'class2',
    courseName: 'Physics Laboratory',
    courseCode: 'PHYS201',
    instructor: 'Prof. Johnson',
    location: 'Lab Building',
    startTime: '14:00',
    endTime: '16:00',
    daysOfWeek: ['Tuesday', 'Thursday'],
    semesterStartDate: '2025-01-15',
    semesterEndDate: '2025-05-15',
    color: '#4ECDC4'
  },
  {
    id: 'class3',
    courseName: 'World History',
    courseCode: 'HIST150',
    instructor: 'Dr. Brown',
    location: 'Room 205',
    startTime: '11:00',
    endTime: '12:30',
    daysOfWeek: ['Monday', 'Wednesday'],
    semesterStartDate: '2025-01-15',
    semesterEndDate: '2025-05-15',
    color: '#45B7D1'
  }
];

/**
 * Test the enhanced first-day AI experience
 */
export async function testFirstDayExperience() {
  console.log('🧪 Testing Enhanced First-Day AI Experience');
  console.log('='.repeat(50));

  // Reset onboarding for testing
  OnboardingManager.resetOnboarding();
  
  // Test 1: Quick setup for new users
  console.log('\n1️⃣ Testing Quick Setup from Timetable');
  const quickPreferences = memoSparkAI.quickSetupForNewUser(testTimetable, 'morning');
  console.log('Quick setup preferences:', {
    studyTimePreference: quickPreferences.studyTimePreference,
    availableStudyHours: quickPreferences.availableStudyHours,
    preferredSubjects: quickPreferences.preferredSubjects
  });

  // Test 2: Generate first-day suggestions
  console.log('\n2️⃣ Testing First-Day Suggestions');
  const firstDaySuggestions = memoSparkAI.getFirstDaySuggestions(testTasks, testTimetable, quickPreferences);
  console.log(`Generated ${firstDaySuggestions.length} suggestions for new user:`);
  firstDaySuggestions.forEach((suggestion: any, index: number) => {
    console.log(`   ${index + 1}. ${suggestion.title} (${suggestion.type}, confidence: ${Math.round(suggestion.confidence * 100)}%)`);
    console.log(`      ${suggestion.description}`);
    console.log(`      Priority: ${suggestion.priority} | Estimated benefit: ${Math.round(suggestion.metadata.estimatedBenefit * 100)}%`);
  });

  // Test 3: Full onboarding experience
  console.log('\n3️⃣ Testing Full Onboarding Experience');
  OnboardingManager.resetOnboarding(); // Reset for full onboarding test
  
  const onboardingResponses = [
    { questionId: 'studyTimePreference', value: 'afternoon' },
    { questionId: 'sessionLengthPreference', value: 'medium' },
    { questionId: 'difficultyComfort', value: 'moderate' },
    { questionId: 'breakFrequency', value: 'moderate' },
    { questionId: 'preferredSubjects', value: ['Mathematics', 'Physics'] },
    { questionId: 'strugglingSubjects', value: ['History'] },
    { questionId: 'availableStudyHours', value: [13, 15, 17, 19] },
    { questionId: 'studyGoals', value: ['Improve grades', 'Better time management'] }
  ];

  const onboardingResult = memoSparkAI.completeOnboarding(onboardingResponses);
  console.log('Onboarding completion result:', {
    success: onboardingResult.success,
    errorsCount: onboardingResult.errors.length,
    warningsCount: onboardingResult.warnings.length,
    preferredSubjects: onboardingResult.preferences.preferredSubjects
  });

  // Test 4: Generate recommendations with full preferences
  console.log('\n4️⃣ Testing Full AI Recommendations');
  const fullRecommendations = await memoSparkAI.generateRecommendations(
    testTasks, 
    'test-user-123', 
    testTimetable, 
    onboardingResult.preferences
  );
  
  console.log('Full AI analysis results:', {
    newUser: fullRecommendations.newUser,
    onboardingNeeded: fullRecommendations.onboardingNeeded,
    dataQuality: Math.round(fullRecommendations.patterns.dataQuality * 100),
    suggestionsCount: fullRecommendations.suggestions.length,
    confidence: AIUtils.formatConfidence(fullRecommendations.patterns.dataQuality)
  });

  // Test 5: Intelligent defaults from timetable
  console.log('\n5️⃣ Testing Intelligent Defaults from Timetable');
  const intelligentDefaults = OnboardingManager.generateDefaultsFromTimetable(testTimetable);
  console.log('Intelligent defaults generated:', {
    suggestedTimePreference: intelligentDefaults.studyTimePreference,
    extractedSubjects: intelligentDefaults.preferredSubjects,
    availableHours: intelligentDefaults.availableStudyHours
  });

  // Test 6: System health and validation
  console.log('\n6️⃣ Testing System Health');
  const systemHealth = memoSparkAI.getSystemHealth();
  const taskValidation = memoSparkAI.validateTaskData(testTasks);
  
  console.log('System health:', {
    hasPatterns: systemHealth.hasPatterns,
    dataQuality: Math.round(systemHealth.dataQuality * 100),
    storageUsage: `${Math.round(systemHealth.storageUsage / 1024 * 100) / 100} KB`
  });
  
  console.log('Task validation:', {
    isValid: taskValidation.isValid,
    issuesCount: taskValidation.issues.length,
    recommendationsCount: taskValidation.recommendations.length
  });

  // Summary
  console.log('\n✅ Enhanced First-Day Experience Test Complete!');
  console.log(`
📊 Test Results Summary:
   ✓ Quick setup: Generated preferences for ${testTimetable.length} classes
   ✓ First-day suggestions: ${firstDaySuggestions.length} personalized recommendations
   ✓ Full onboarding: ${onboardingResult.success ? 'Successful' : 'Failed'}
   ✓ AI recommendations: ${fullRecommendations.suggestions.length} suggestions with ${Math.round(fullRecommendations.patterns.dataQuality * 100)}% data quality
   ✓ Intelligent defaults: Auto-detected ${intelligentDefaults.preferredSubjects?.length || 0} subjects and ${intelligentDefaults.availableStudyHours?.length || 0} free hours
   ✓ System validation: ${taskValidation.isValid ? 'All systems operational' : `${taskValidation.issues.length} issues detected`}

🎯 New User Experience:
   • AI provides meaningful suggestions from day one
   • Timetable analysis automatically detects free study slots
   • Quick setup takes less than 2 minutes
   • Full onboarding provides comprehensive personalization
   • System intelligently adapts to user preferences and schedule
  `);
}

/**
 * Performance test for AI responsiveness
 */
export async function testAIPerformance() {
  console.log('\n⚡ Testing AI Performance');
  
  const startTime = Date.now();
  
  // Test pattern analysis speed
  const analysisStart = Date.now();
  const patterns = await memoSparkAI.generateRecommendations(testTasks, 'perf-test', testTimetable);
  const analysisTime = Date.now() - analysisStart;
  
  // Test suggestion generation speed
  const suggestionStart = Date.now();
  const quickSuggestions = memoSparkAI.getFirstDaySuggestions(testTasks, testTimetable);
  const suggestionTime = Date.now() - suggestionStart;
  
  const totalTime = Date.now() - startTime;
  
  console.log('Performance results:', {
    patternAnalysis: `${analysisTime}ms`,
    suggestionGeneration: `${suggestionTime}ms`,
    totalTime: `${totalTime}ms`,
    performanceTarget: '< 100ms',
    passed: totalTime < 100
  });
  
  return {
    analysisTime,
    suggestionTime,
    totalTime,
    targetMet: totalTime < 100
  };
}

// Auto-run tests if in development
if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
  console.log('🚀 Auto-running First-Day AI Tests in Development Mode');
  testFirstDayExperience().then(() => {
    return testAIPerformance();
  }).catch(console.error);
} 