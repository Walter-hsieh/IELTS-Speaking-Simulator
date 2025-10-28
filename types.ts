export interface IQuestion {
  part: number;
  type: 'introduction' | 'cue-card' | 'discussion';
  question: string;
  cueCard?: {
    topic: string;
    points: string[];
  };
}

export interface ICriterion {
  criterion: string;
  score: number;
  feedback: string;
}

export interface IImprovedSpeakingAnswer {
  question: string;
  improvedAnswer: string;
}

export interface IImprovedAnswers {
  writingTask1: string;
  writingTask2: string;
  speaking: IImprovedSpeakingAnswer[];
}

export interface IEvaluation {
  overallBandScore: number;
  detailedScores: ICriterion[];
  summary: string;
  improvedAnswers: IImprovedAnswers;
}

export interface IPracticeItem {
  area: string;
  title: string;
  description: string;
  exercise: string;
}

// New types for comprehensive test
export interface IListeningQuestion {
  question: string;
  type: 'multiple-choice' | 'short-answer';
  options?: string[];
}

export interface IReadingQuestion {
  question: string;
  type: 'multiple-choice' | 'short-answer' | 'true-false-not-given';
  options?: string[];
}

export interface IListeningSection {
  questions: IListeningQuestion[];
}

export interface IReadingSection {
  transcript: string;
  questions: IReadingQuestion[];
}

export interface IChartData {
    type: 'bar chart' | 'line chart' | 'pie chart' | 'table';
    title: string;
    data: string;
}

export interface IWritingSection {
  task1: {
    prompt: string;
    chartData: IChartData;
    chartImage?: string; // Optional: base64 string of the generated chart image
  };
  task2: string;
}

export interface IComprehensiveTest {
  listening: IListeningSection;
  reading: IReadingSection;
  writing: IWritingSection;
  speaking: IQuestion[];
}