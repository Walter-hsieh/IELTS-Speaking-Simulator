import React, { useState, useEffect, useMemo } from 'react';
import { IComprehensiveTest, IQuestion, TestType } from '../types';
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

const TableRenderer: React.FC<{ data: string; title: string }> = ({ data, title }) => {
  try {
    const rows = data.split('\n').filter(row => row.trim() !== '');
    if (rows.length < 2) return <p>Table data is invalid.</p>; // Needs at least a header and one row

    const headers = rows[0].split(',').map(h => h.trim());
    const bodyRows = rows.slice(1).map(row => row.split(',').map(cell => cell.trim()));

    return (
      <div className="my-4 p-4 border rounded-md bg-gray-50 overflow-x-auto">
        <h4 className="text-lg font-semibold mb-2 text-center">{title}</h4>
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100">
            <tr>
              {headers.map((header, index) => (
                <th key={index} scope="col" className="px-6 py-3">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="bg-white border-b hover:bg-gray-50">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-6 py-4">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } catch (error) {
    console.error("Failed to render table:", error);
    return <p className="text-red-500">Error: Could not display the table data.</p>;
  }
};

interface TestScreenProps {
  testContent: IComprehensiveTest;
  videoUrl: string;
  onTestComplete: (answers: Record<string, any>) => void;
  testType: TestType;
}

type TestSection = 'listening' | 'reading' | 'writing' | 'speaking';

const TestScreen: React.FC<TestScreenProps> = ({ testContent, videoUrl, onTestComplete, testType }) => {
  const getInitialSection = (): TestSection => {
    if (testType === 'full') return 'listening';
    return testType;
  }
  const [currentSection, setCurrentSection] = useState<TestSection>(getInitialSection());
  const [answers, setAnswers] = useState<Record<string, any>>({
    listening: {}, reading: {}, writing: { task1: '', task2: '' }, speaking: []
  });

  const { isListening, transcript, startListening, stopListening, setTranscript } = useSpeechToText();
  const [currentSpeakingQuestionIndex, setCurrentSpeakingQuestionIndex] = useState(0);

  const videoId = useMemo(() => {
    try {
      const url = new URL(videoUrl);
      if (url.hostname === "youtu.be") {
          return url.pathname.slice(1);
      }
      return url.searchParams.get("v") || '';
    } catch (e) {
      return '';
    }
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
    if (testType !== 'full') {
        onTestComplete(answers);
        return;
    }
    const sections: TestSection[] = ['listening', 'reading', 'writing', 'speaking'];
    const currentIndex = sections.indexOf(currentSection);
    if (currentIndex < sections.length - 1) {
      setCurrentSection(sections[currentIndex + 1]);
    }
  };

  const handleDownloadTest = () => {
    let content = `IELTS Mock Test Content\n\n`;
    content += `Video URL: ${videoUrl}\n\n`;
    content += `--- TRANSCRIPT / READING PASSAGE ---\n`;
    content += `${testContent.reading.transcript}\n\n`;

    if (testContent.listening.questions.length > 0) {
      content += `--- LISTENING QUESTIONS ---\n`;
      testContent.listening.questions.forEach((q, i) => { content += `${i + 1}. ${q.question}\n`; });
      content += `\n`;
    }
    if (testContent.reading.questions.length > 0) {
      content += `--- READING QUESTIONS ---\n`;
      testContent.reading.questions.forEach((q, i) => { content += `${i + 1}. ${q.question}\n`; });
      content += `\n`;
    }
    if (testContent.writing.task1.prompt || testContent.writing.task2) {
      content += `--- WRITING QUESTIONS ---\n`;
      content += `Task 1: ${testContent.writing.task1.prompt}\n`;
      if (testContent.writing.task1.chartData) {
          content += `Chart Title: ${testContent.writing.task1.chartData.title}\n`;
          content += `Chart Type: ${testContent.writing.task1.chartData.type}\n`;
          content += `Chart Data: ${testContent.writing.task1.chartData.data}\n`;
      }
      content += `\nTask 2: ${testContent.writing.task2}\n`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ielts-mock-test.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // SPEAKING SECTION LOGIC
  const currentSpeakingQuestion: IQuestion | undefined = testContent.speaking[currentSpeakingQuestionIndex];
  const isLastSpeakingQuestion = currentSpeakingQuestionIndex === testContent.speaking.length - 1;

  const handleNextSpeakingQuestion = () => {
    if (!currentSpeakingQuestion) return;
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
          {testContent.writing.task1.chartData?.type === 'table' ? (
             <TableRenderer data={testContent.writing.task1.chartData.data} title={testContent.writing.task1.chartData.title} />
          ) : testContent.writing.task1.chartImage && (
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
  
  const renderSpeaking = () => {
    if (!currentSpeakingQuestion) return <p>Loading speaking question...</p>;
    return (
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
  )};

  const renderContent = () => {
    switch (currentSection) {
      case 'listening': return testContent.listening?.questions?.length > 0 ? renderListening() : <p>No listening questions generated for this test.</p>;
      case 'reading': return testContent.reading?.questions?.length > 0 ? renderReading() : <p>No reading questions generated for this test.</p>;
      case 'writing': return (testContent.writing?.task1.prompt || testContent.writing?.task2) ? renderWriting() : <p>No writing tasks generated for this test.</p>;
      case 'speaking': return testContent.speaking?.length > 0 ? renderSpeaking() : <p>No speaking questions generated for this test.</p>;
      default: return null;
    }
  };

  return (
    <div className="w-full">
       <div className="w-full flex justify-end mb-4 -mt-4">
        <button
          onClick={handleDownloadTest}
          className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm"
        >
          Download Test Content
        </button>
      </div>
      {renderContent()}
      {currentSection !== 'speaking' && (
        <div className="text-center mt-8">
           <button
             onClick={nextSection}
             className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition-colors duration-300 shadow-md text-lg"
           >
             {testType === 'full' ? 'Next Section' : 'Finish & Submit'}
           </button>
        </div>
      )}
    </div>
  );
};

export default TestScreen;