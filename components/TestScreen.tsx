import React, { useState, useEffect, useMemo } from 'react';
import { IComprehensiveTest, IQuestion } from '../types';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { StopIcon } from './icons/StopIcon';

// Speech Recognition API types (unchanged from previous version)
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  start(): void;
  stop(): void;
}
interface SpeechRecognitionStatic { new (): SpeechRecognition; }
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

const useSpeechToText = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition API is not supported in this browser.");
      return;
    }
    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onresult = (event) => {
      const fullTranscript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setTranscript(fullTranscript);
    };

    setRecognition(recognitionInstance);
  }, []);

  const startListening = () => {
    if (recognition) {
      setTranscript('');
      setIsListening(true);
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition) {
      setIsListening(false);
      recognition.stop();
    }
  };

  return { isListening, transcript, startListening, stopListening, setTranscript };
};

const YoutubePlayer: React.FC<{ videoId: string }> = ({ videoId }) => (
    <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg">
        <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
        ></iframe>
    </div>
);


interface TestScreenProps {
  testContent: IComprehensiveTest;
  videoUrl: string;
  onTestComplete: (answers: Record<string, any>) => void;
}

type TestSection = 'listening' | 'reading' | 'writing' | 'speaking';

const TestScreen: React.FC<TestScreenProps> = ({ testContent, videoUrl, onTestComplete }) => {
  const [currentSection, setCurrentSection] = useState<TestSection>('listening');
  const [answers, setAnswers] = useState<Record<string, any>>({
    listening: {}, reading: {}, writing: { task1: '', task2: '' }, speaking: []
  });

  const { isListening, transcript, startListening, stopListening, setTranscript } = useSpeechToText();
  const [currentSpeakingQuestionIndex, setCurrentSpeakingQuestionIndex] = useState(0);

  const videoId = useMemo(() => {
    const url = new URL(videoUrl);
    if (url.hostname === "youtu.be") {
        return url.pathname.slice(1);
    }
    return url.searchParams.get("v") || '';
  }, [videoUrl]);
  
  const handleAnswerChange = (section: TestSection, index: number, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [index]: value,
      }
    }));
  };

  const handleWritingChange = (task: 'task1' | 'task2', value: string) => {
     setAnswers(prev => ({
      ...prev,
      writing: {
        ...prev.writing,
        [task]: value,
      }
    }));
  };
  
  const nextSection = () => {
    const sections: TestSection[] = ['listening', 'reading', 'writing', 'speaking'];
    const currentIndex = sections.indexOf(currentSection);
    if (currentIndex < sections.length - 1) {
      setCurrentSection(sections[currentIndex + 1]);
    } else {
      onTestComplete(answers);
    }
  };

  // SPEAKING SECTION LOGIC
  const currentSpeakingQuestion: IQuestion = testContent.speaking[currentSpeakingQuestionIndex];
  const isLastSpeakingQuestion = currentSpeakingQuestionIndex === testContent.speaking.length - 1;

  const handleNextSpeakingQuestion = () => {
    if (isListening) stopListening();
    const newAnswer = { question: currentSpeakingQuestion.question, answer: transcript };
    const updatedSpeakingAnswers = [...answers.speaking, newAnswer];
    setAnswers(prev => ({...prev, speaking: updatedSpeakingAnswers }));
    
    if (isLastSpeakingQuestion) {
      onTestComplete({...answers, speaking: updatedSpeakingAnswers});
    } else {
      setCurrentSpeakingQuestionIndex(prev => prev + 1);
      setTranscript('');
    }
  };

  const toggleRecording = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const renderListening = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-center">Part 1: Listening</h2>
      <p className="text-center text-gray-600 mb-6">Play the video and answer the questions below.</p>
      {videoId && <YoutubePlayer videoId={videoId} />}
      <div className="mt-8 space-y-6">
        {testContent.listening.questions.map((q, index) => (
          <div key={index}>
            <label className="block font-semibold text-gray-700 mb-2">{index + 1}. {q.question}</label>
            <input 
              type="text" 
              className="w-full p-2 border border-gray-300 rounded-md"
              onChange={(e) => handleAnswerChange('listening', index, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );

  const renderReading = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-center">Part 2: Reading</h2>
      <div className="max-h-[300px] overflow-y-auto p-4 border rounded-md bg-gray-50 mb-6">
        <h3 className="text-xl font-semibold mb-2">Video Transcript / Reading Passage</h3>
        <p className="text-gray-700 whitespace-pre-wrap">{testContent.reading.transcript}</p>
      </div>
      <div className="space-y-6">
        {testContent.reading.questions.map((q, index) => (
          <div key={index}>
            <label className="block font-semibold text-gray-700 mb-2">{index + 1}. {q.question}</label>
            <input 
              type="text" 
              className="w-full p-2 border border-gray-300 rounded-md"
              onChange={(e) => handleAnswerChange('reading', index, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );

  const renderWriting = () => (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-center">Part 3: Writing</h2>
      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-semibold mb-2">Task 1</h3>

          {testContent.writing.task1.chartImage && (
            <div className="my-4 p-4 border rounded-md flex justify-center bg-gray-50">
                <img 
                    src={`data:image/png;base64,${testContent.writing.task1.chartImage}`} 
                    alt={testContent.writing.task1.chartData.title}
                    className="max-w-full h-auto rounded-md shadow-sm"
                />
            </div>
           )}

          <p className="mb-2 p-4 bg-gray-100 rounded-md">{testContent.writing.task1.prompt}</p>
          <textarea 
            className="w-full p-2 border border-gray-300 rounded-md min-h-[200px]"
            placeholder="Write your response for Task 1 here..."
            onChange={(e) => handleWritingChange('task1', e.target.value)}
            value={answers.writing.task1}
          />
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">Task 2</h3>
          <p className="mb-2 p-4 bg-gray-100 rounded-md">{testContent.writing.task2}</p>
          <textarea 
            className="w-full p-2 border border-gray-300 rounded-md min-h-[250px]"
            placeholder="Write your response for Task 2 here..."
            onChange={(e) => handleWritingChange('task2', e.target.value)}
            value={answers.writing.task2}
          />
        </div>
      </div>
    </div>
  );
  
  const renderSpeaking = () => (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-6 text-center">Part 4: Speaking</h2>
      <div className="w-full max-w-3xl mb-8 p-6 bg-gray-100 rounded-lg shadow-inner">
        <p className="text-sm font-semibold text-blue-600 mb-2">Part {currentSpeakingQuestion.part} - Question {currentSpeakingQuestionIndex + 1}/{testContent.speaking.length}</p>
        <p className="text-xl text-gray-800 font-medium mb-4">{currentSpeakingQuestion.question}</p>
        {currentSpeakingQuestion.cueCard && (
          <div className="mt-4 p-4 border border-gray-300 rounded-md bg-white">
            <h4 className="font-bold text-lg mb-2">{currentSpeakingQuestion.cueCard.topic}</h4>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              {currentSpeakingQuestion.cueCard.points.map(point => <li key={point}>{point}</li>)}
            </ul>
          </div>
        )}
      </div>

      <div className="w-full max-w-3xl mb-6">
        <label htmlFor="transcript-editor" className="block text-sm font-medium text-gray-700 mb-2">
          Your Answer { !isListening && transcript && <span className="font-normal text-gray-500">- Feel free to edit your response</span> }
        </label>
        <textarea
          id="transcript-editor" value={transcript} onChange={(e) => setTranscript(e.target.value)}
          disabled={isListening} placeholder="Your answer will appear here after you start recording..."
          className="w-full p-4 border border-gray-300 rounded-lg min-h-[150px] bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
          aria-label="Your transcribed answer. You can edit this text when recording is stopped."
        />
      </div>

      <div className="flex items-center space-x-4">
        <button onClick={toggleRecording} aria-label={isListening ? 'Stop recording' : 'Start recording'}
          className={`p-4 rounded-full transition-colors duration-200 ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {isListening ? <StopIcon /> : <MicrophoneIcon />}
        </button>
        <button onClick={handleNextSpeakingQuestion} disabled={isListening}
          className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition-colors duration-300 shadow-md text-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
          {isLastSpeakingQuestion ? 'Finish & Evaluate' : 'Next Question'}
        </button>
      </div>
      {isListening && <p className="mt-4 text-red-500 animate-pulse">Recording...</p>}
    </div>
  );

  const renderContent = () => {
    switch (currentSection) {
      case 'listening': return renderListening();
      case 'reading': return renderReading();
      case 'writing': return renderWriting();
      case 'speaking': return renderSpeaking();
      default: return null;
    }
  };

  return (
    <div className="w-full">
      {renderContent()}
      {currentSection !== 'speaking' && (
        <div className="text-center mt-8">
           <button
             onClick={nextSection}
             className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition-colors duration-300 shadow-md text-lg"
           >
             Next Section
           </button>
        </div>
      )}
    </div>
  );
};

export default TestScreen;