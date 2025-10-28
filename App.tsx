import React, { useState, useCallback } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import TestScreen from './components/TestScreen';
import EvaluationScreen from './components/EvaluationScreen';
import Loader from './components/Loader';
import { IEvaluation, IPracticeItem, IComprehensiveTest, TestType } from './types';
import { evaluateComprehensiveTest, getPracticePlan, generateComprehensiveTest, generateChartImage } from './services/geminiService';

export type AppState = 'welcome' | 'generating' | 'test' | 'evaluating' | 'results';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [evaluation, setEvaluation] = useState<IEvaluation | null>(null);
  const [practicePlan, setPracticePlan] = useState<IPracticeItem[] | null>(null);
  const [comprehensiveTest, setComprehensiveTest] = useState<IComprehensiveTest | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, any> | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [testType, setTestType] = useState<TestType | null>(null);

  const startTest = useCallback(async (url: string, transcript: string, type: TestType) => {
    setAppState('generating');
    setError(null);
    setVideoUrl(url);
    setTestType(type);

    try {
      // Step 1: Generate the text-based test content, including structured data for the chart.
      const testContent = await generateComprehensiveTest(url, transcript, type);

      // Step 2: If chart data exists, is not a table, generate a visual chart image from it.
      if (testContent.writing?.task1.chartData && testContent.writing.task1.chartData.type !== 'table') {
        const chartImageBase64 = await generateChartImage(testContent.writing.task1.chartData);
        testContent.writing.task1.chartImage = chartImageBase64;
      }
      
      setComprehensiveTest(testContent);
      setAppState('test');
    } catch (err) {
      console.error(err);
      setError('Failed to generate the test. Please check the video URL or try again.');
      setAppState('welcome');
    }
  }, []);
  
  const restartTest = () => {
    setAppState('welcome');
    setError(null);
    setEvaluation(null);
    setPracticePlan(null);
    setComprehensiveTest(null);
    setUserAnswers(null);
    setVideoUrl('');
    setTestType(null);
  };

  const handleTestComplete = useCallback(async (answers: Record<string, any>) => {
    if (!comprehensiveTest || !testType) {
      setError("Test content is missing. Please restart.");
      setAppState('welcome');
      return;
    }
    
    setUserAnswers(answers);
    setError(null);
    
    // Only run full evaluation for subjective tests (Writing, Speaking)
    if (testType === 'writing' || testType === 'speaking' || testType === 'full') {
      setAppState('evaluating');
      try {
        const fullTestPayload = {
          testContent: comprehensiveTest,
          userAnswers: answers
        };

        const evalResult = await evaluateComprehensiveTest(fullTestPayload);
        setEvaluation(evalResult);
        
        const practiceResult = await getPracticePlan(evalResult);
        setPracticePlan(practiceResult);

        setAppState('results');
      } catch (err) {
        console.error(err);
        setError('An error occurred during evaluation. Please try again.');
        setAppState('test');
      }
    } else { // For Listening and Reading, just show the answer key
      setEvaluation(null);
      setPracticePlan(null);
      setAppState('results');
    }
  }, [comprehensiveTest, testType]);

  const renderContent = () => {
    switch (appState) {
      case 'welcome':
        return <WelcomeScreen onStart={startTest} error={error} />;
      case 'generating':
        return <Loader message="Analyzing transcript, creating test, and generating visuals..." />;
      case 'test':
        if (comprehensiveTest && videoUrl && testType) {
          return <TestScreen testContent={comprehensiveTest} videoUrl={videoUrl} onTestComplete={handleTestComplete} testType={testType} />;
        }
        // Fallback if test data is missing
        restartTest();
        return null;
      case 'evaluating':
        return <Loader message="Our AI examiner is evaluating your performance and preparing model answers..." />;
      case 'results':
        if (comprehensiveTest && userAnswers) {
          return <EvaluationScreen evaluation={evaluation} practicePlan={practicePlan} userAnswers={userAnswers} onRestart={restartTest} testContent={comprehensiveTest} />;
        }
        // Fallback
        restartTest();
        return null;
      default:
        return <WelcomeScreen onStart={startTest} error={error} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600">IELTS Simulator Pro</h1>
          <p className="text-lg text-gray-600 mt-2">Your personal AI-powered coach for IELTS success.</p>
        </header>
        <main className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 md:p-12 min-h-[60vh] flex items-center justify-center">
          {renderContent()}
        </main>
        <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} IELTS AI Simulator. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;