import { HuggingFaceService } from './HuggingFaceService';
import { VoiceService } from './VoiceService';
import { StuPersonality } from './StuPersonality';
import type { ExtendedTask, SuggestionContext } from '../../types/ai';

// Mock data for testing
const sampleTasks: ExtendedTask[] = [
  {
    id: '1',
    title: 'Study React Components',
    description: 'Learn advanced React patterns',
    dueDate: '2024-01-20T10:00:00Z',
    priority: 'high' as const,
    type: 'academic' as const,
    subject: 'Computer Science',
    completed: false,
    reminder: false,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  }
];

const sampleContext: SuggestionContext = {
  currentTime: new Date('2024-01-15T14:00:00Z'),
  upcomingTasks: sampleTasks,
  recentActivity: [],
  userPreferences: {
    preferredStudyDuration: 60,
    enableBreakReminders: true,
    enableSuggestions: true,
    suggestionFrequency: 'moderate' as const,
    difficultyPreference: 'adaptive' as const,
    preferredStudyTimes: ['14:00-16:00'],
    preferredBreakDuration: 15,
    maxDailyStudyHours: 8,
    cloudSyncEnabled: true,
    shareAnonymousData: false,
    personalizedStuInteraction: true,
    enableStudyReminders: true,
    reminderAdvanceTime: 15,
    adaptiveDifficulty: true,
    focusOnWeakSubjects: true,
    balanceSubjects: true
  }
};

async function testHuggingFaceService() {
  console.log('🤖 Testing HuggingFace Service...');
  const hfService = new HuggingFaceService();
  
  try {
    const health = await hfService.checkHealth();
    console.log('✅ HuggingFace Health:', health);
    
    // Test suggestion enhancement
    const mockSuggestions = [
      {
        id: '1',
        type: 'task_suggestion' as const,
        title: 'Review React concepts',
        description: 'Basic review',
        priority: 'medium' as const,
        source: 'AI',
        confidence: 0.5
      }
    ];
    
    const enhanced = await hfService.enhanceSuggestions(mockSuggestions, sampleTasks, sampleContext);
    console.log('✅ Enhanced suggestions:', enhanced.length, 'suggestions');
    
    return true;
  } catch (error) {
    console.log('⚠️ HuggingFace Service:', error instanceof Error ? error.message : 'Error occurred');
    return false;
  }
}

async function testVoiceService() {
  console.log('🎤 Testing Voice Service...');
  const voiceService = new VoiceService();
  
  try {
    const support = voiceService.checkBrowserSupport();
    console.log('✅ Voice Browser Support:', support);
    
    const health = voiceService.getServiceHealth();
    console.log('✅ Voice Service Health:', health);
    
    return true;
  } catch (error) {
    console.log('⚠️ Voice Service:', error instanceof Error ? error.message : 'Error occurred');
    return false;
  }
}

async function testStuPersonality() {
  console.log('🎭 Testing Stu Personality...');
  const stuService = new StuPersonality();
  
  try {
    const response = await stuService.generateResponse(sampleTasks, 'test-user', sampleContext);
    console.log('✅ Stu Response:', response.message.substring(0, 50) + '...');
    console.log('✅ Stu Mood:', response.mood);
    
    const status = stuService.getPersonalityStatus();
    console.log('✅ Stu Status:', status);
    
    return true;
  } catch (error) {
    console.log('⚠️ Stu Personality:', error instanceof Error ? error.message : 'Error occurred');
    return false;
  }
}

export async function testPremiumFeatures() {
  console.log('🚀 Testing Premium ML Features Integration...\n');
  
  const results = {
    huggingFace: await testHuggingFaceService(),
    voice: await testVoiceService(),
    stu: await testStuPersonality()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('HuggingFace Service:', results.huggingFace ? '✅ PASS' : '❌ FAIL');
  console.log('Voice Service:', results.voice ? '✅ PASS' : '❌ FAIL');
  console.log('Stu Personality:', results.stu ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = Object.values(results).every(Boolean);
  console.log('\n🎯 Overall Status:', allPassed ? '✅ ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED');
  
  return results;
}

// Run tests if called directly
if (require.main === module) {
  testPremiumFeatures().catch(console.error);
} 