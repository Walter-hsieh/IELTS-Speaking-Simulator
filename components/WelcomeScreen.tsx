import React, { useState } from 'react';
import { TestType } from '../types';

interface WelcomeScreenProps {
  onStart: (videoUrl: string, transcript: string, testType: TestType) => void;
  error?: string | null;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, error }) => {
  const [videoUrl, setVideoUrl] = useState('https://youtu.be/p1yCOdp2vs0?si=pKV47XzCq44ERMGO');
  const [transcript, setTranscript] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleStart = (testType: TestType) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    if (!youtubeRegex.test(videoUrl)) {
      setValidationError('Please enter a valid YouTube URL.');
      return;
    }
    if (transcript.trim().length < 50) {
      setValidationError('Please paste the video transcript. It should be at least 50 characters long.');
      return;
    }
    setValidationError('');
    onStart(videoUrl, transcript, testType);
  };

  return (
    <div className="text-center w-full max-w-2xl">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">Create Your IELTS Mock Test</h2>
      <p className="text-gray-600 mb-6 text-lg">
        Provide a YouTube link and its transcript. Our AI will create a mock test based on the video's content.
      </p>
      
      <div className="w-full mb-4 text-left">
        <label htmlFor="video-url" className="font-semibold text-gray-700 mb-1 block">1. YouTube Video URL</label>
        <input
          id="video-url"
          type="text"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="e.g., https://www.youtube.com/watch?v=..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow duration-200"
        />
      </div>

      <div className="w-full mb-6 text-left">
        <label htmlFor="transcript" className="font-semibold text-gray-700 mb-1 block">2. Paste Video Transcript</label>
        <div className="text-xs text-gray-500 mb-2">
          On YouTube, click the '...' button below the video, then 'Show transcript'. Copy and paste it here.
        </div>
        <textarea
          id="transcript"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste the full video transcript here to ensure questions are relevant..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow duration-200 min-h-[150px]"
        />
        {validationError && <p className="text-red-500 text-sm mt-1">{validationError}</p>}
      </div>

      <div className="w-full">
        <p className="font-semibold text-gray-700 mb-3 text-lg">3. Choose your test type</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button onClick={() => handleStart('full')} className="col-span-1 sm:col-span-2 lg:col-span-3 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-300 shadow-md text-xl">
            Full Mock Test
          </button>
          <button onClick={() => handleStart('listening')} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
            Listening Only
          </button>
          <button onClick={() => handleStart('reading')} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
            Reading Only
          </button>
          <button onClick={() => handleStart('writing')} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
            Writing Only
          </button>
           <button onClick={() => handleStart('speaking')} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors sm:col-span-2 lg:col-span-3">
            Speaking Only
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};

export default WelcomeScreen;