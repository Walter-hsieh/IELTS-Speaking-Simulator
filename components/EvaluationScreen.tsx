import React, { useState, useEffect } from 'react';
import { IEvaluation, IPracticeItem, IComprehensiveTest, IReadingQuestion, IListeningQuestion } from '../types';

// TypeScript declarations for libraries loaded via CDN
declare const html2canvas: any;
declare const jspdf: { jsPDF: new (options?: any) => any };

interface EvaluationScreenProps {
  evaluation: IEvaluation | null;
  practicePlan: IPracticeItem[] | null;
  userAnswers: Record<string, any>;
  onRestart: () => void;
  testContent: IComprehensiveTest;
}

const ScoreCircle: React.FC<{ score: number }> = ({ score }) => {
  const getScoreColor = () => {
    if (score >= 7.5) return 'text-green-500';
    if (score >= 6.0) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className={`w-32 h-32 rounded-full border-8 ${getScoreColor().replace('text-', 'border-')} flex items-center justify-center mx-auto mb-4 bg-gray-50`}>
      <span className={`text-5xl font-bold ${getScoreColor()}`}>{score.toFixed(1)}</span>
    </div>
  );
};

const AnswerComparison: React.FC<{ title: string, original: string, improved: string }> = ({ title, original, improved }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">{title}</h4>
        <div className="grid md:grid-cols-2 gap-6">
            <div>
                <h5 className="font-bold text-gray-600 mb-2">Your Answer</h5>
                <div className="bg-gray-100 p-4 rounded-md border h-full whitespace-pre-wrap text-sm">{original || "No answer provided."}</div>
            </div>
            <div>
                <h5 className="font-bold text-green-700 mb-2">Band 7.5 Model Answer</h5>
                <div className="bg-green-50 p-4 rounded-md border border-green-200 h-full whitespace-pre-wrap text-sm">{improved}</div>
            </div>
        </div>
    </div>
);

const AnswerKey: React.FC<{
  title: string;
  questions: (IReadingQuestion | IListeningQuestion)[];
  userAnswers: Record<string, string>;
}> = ({ title, questions, userAnswers }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm">
    <h3 className="text-xl font-semibold text-gray-800 mb-4">{title} Answer Key</h3>
    <div className="space-y-4">
      {questions.map((q, index) => (
        <div key={index} className="p-4 border rounded-md bg-gray-50">
          <p className="font-semibold text-gray-700 mb-2">{index + 1}. {q.question}</p>
          <p className="text-sm text-blue-700"><span className="font-bold">Your Answer:</span> {userAnswers[index] || <span className="italic text-gray-500">No answer provided</span>}</p>
          <p className="text-sm text-green-700"><span className="font-bold">Correct Answer:</span> {q.answer}</p>
        </div>
      ))}
    </div>
  </div>
);

const EvaluationScreen: React.FC<EvaluationScreenProps> = ({ evaluation, practicePlan, userAnswers, onRestart, testContent }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPdfReady, setIsPdfReady] = useState(false);

  useEffect(() => {
    if (typeof html2canvas !== 'undefined' && typeof jspdf !== 'undefined') {
      setIsPdfReady(true);
      return;
    }
    const intervalId = setInterval(() => {
      if (typeof html2canvas !== 'undefined' && typeof jspdf !== 'undefined') {
        setIsPdfReady(true);
        clearInterval(intervalId);
      }
    }, 200);
    return () => clearInterval(intervalId);
  }, []);

  const mainScores = evaluation?.detailedScores.filter(s => 
    ['Listening', 'Reading', 'Writing', 'Speaking'].includes(s.criterion)
  ) || [];
  
  const detailedCriteria = evaluation?.detailedScores.filter(s => 
    !['Listening', 'Reading', 'Writing', 'Speaking'].includes(s.criterion)
  ) || [];

  const handleSaveAsPdf = () => {
    setIsGeneratingPdf(true);
    const reportElement = document.getElementById('evaluation-report');

    if (reportElement) {
      html2canvas(reportElement, { scale: 2 }).then((canvas: any) => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = jspdf;
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('ielts-evaluation-report.pdf');
        setIsGeneratingPdf(false);
      }).catch((err: any) => {
        console.error("Error generating PDF:", err);
        alert("An error occurred while generating the PDF. Please check the console for details.");
        setIsGeneratingPdf(false);
      });
    } else {
        console.error("Could not find the report element to save.");
        setIsGeneratingPdf(false);
    }
  };

  const handleSaveAsMarkdown = () => {
    let markdownContent = `# IELTS Evaluation Report\n\n`;
    if(evaluation) {
      markdownContent += `## Overall Band Score: ${evaluation.overallBandScore.toFixed(1)}\n\n`;
      markdownContent += `| Section   | Score |\n`;
      markdownContent += `|-----------|-------|\n`;
      mainScores.forEach(score => {
          markdownContent += `| ${score.criterion} | ${score.score.toFixed(1)} |\n`;
      });
      markdownContent += `\n`;

      markdownContent += `## Examiner's Summary\n\n`;
      markdownContent += `${evaluation.summary}\n\n`;

      markdownContent += `## Detailed Feedback\n\n`;
      detailedCriteria.forEach(item => {
          markdownContent += `### ${item.criterion}: ${item.score.toFixed(1)}\n`;
          markdownContent += `${item.feedback}\n\n`;
      });
    }

    if (evaluation?.improvedAnswers) {
        markdownContent += `## Path to Band 7.5: Model Answers\n\n`;
        
        markdownContent += `### Writing Task 1\n\n#### Question\n\n`;
        markdownContent += `${testContent.writing.task1.prompt}\n\n`;
        markdownContent += `#### Your Answer\n\n`;
        markdownContent += "```\n" + (userAnswers.writing.task1 || "No answer provided.") + "\n```\n\n";
        markdownContent += `#### Model Answer (Band 7.5)\n\n`;
        markdownContent += "```\n" + evaluation.improvedAnswers.writingTask1 + "\n```\n\n";

        markdownContent += `### Writing Task 2\n\n#### Question\n\n`;
        markdownContent += `${testContent.writing.task2}\n\n`;
        markdownContent += `#### Your Answer\n\n`;
        markdownContent += "```\n" + (userAnswers.writing.task2 || "No answer provided.") + "\n```\n\n";
        markdownContent += `#### Model Answer (Band 7.5)\n\n`;
        markdownContent += "```\n" + evaluation.improvedAnswers.writingTask2 + "\n```\n\n";

        evaluation.improvedAnswers.speaking.forEach((item, index) => {
            markdownContent += `### Speaking Question: "${item.question}"\n\n#### Your Answer\n\n`;
            markdownContent += "```\n" + (userAnswers.speaking[index]?.answer || "No answer provided.") + "\n```\n\n";
            markdownContent += `#### Model Answer (Band 7.5)\n\n`;
            markdownContent += "```\n" + item.improvedAnswer + "\n```\n\n";
        });
    }

    if (practicePlan) {
      markdownContent += `## Your Personalized Practice Plan\n\n`;
      practicePlan.forEach(item => {
          markdownContent += `### ${item.title}\n\n`;
          markdownContent += `**Focus Area:** ${item.area}\n\n`;
          markdownContent += `${item.description}\n\n`;
          markdownContent += `**Exercise:**\n`;
          markdownContent += "```\n" + item.exercise + "\n```\n\n";
      });
    }

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ielts-evaluation-report.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getPdfButtonText = () => {
    if (isGeneratingPdf) return 'Saving PDF...';
    if (!isPdfReady) return 'Loading PDF Tools...';
    return 'Save as PDF';
  };

  return (
    <div className="w-full">
      <div id="evaluation-report" className="p-2">

        {(testContent.listening.questions.length > 0 || testContent.reading.questions.length > 0) && (
          <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200 mb-10">
            <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Answer Key</h2>
            <div className="space-y-6">
              {testContent.listening.questions.length > 0 && <AnswerKey title="Listening" questions={testContent.listening.questions} userAnswers={userAnswers.listening || {}} />}
              {testContent.reading.questions.length > 0 && <AnswerKey title="Reading" questions={testContent.reading.questions} userAnswers={userAnswers.reading || {}} />}
            </div>
          </div>
        )}
        
        {evaluation && (
          <>
            <h2 className="text-3xl font-bold text-center mb-2">Your Full Evaluation Report</h2>
            <div className="text-center mb-8">
              <ScoreCircle score={evaluation.overallBandScore} />
              <p className="text-lg font-semibold text-gray-700">Overall Band Score</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-center">
              {mainScores.map(score => (
                <div key={score.criterion} className="bg-gray-100 p-4 rounded-lg">
                  <p className="font-semibold text-gray-800">{score.criterion}</p>
                  <p className="text-3xl font-bold text-blue-600">{score.score.toFixed(1)}</p>
                </div>
              ))}
            </div>
            <p className="text-gray-600 max-w-3xl mx-auto text-center mb-10 bg-gray-50 p-4 rounded-md border">{evaluation.summary}</p>
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {detailedCriteria.map((item) => (
                <div key={item.criterion} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-semibold text-gray-800">{item.criterion}</h3>
                    <span className="text-2xl font-bold text-blue-600">{item.score.toFixed(1)}</span>
                  </div>
                  <p className="text-gray-600">{item.feedback}</p>
                </div>
              ))}
            </div>
            {evaluation.improvedAnswers && (
                <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200 mb-10">
                    <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Your Path to Band 7.5: Model Answers</h2>
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-lg shadow-sm">
                          <h4 className="text-lg font-semibold text-gray-800 mb-2">Writing Task 1</h4>
                          <div className="mb-4">
                            <h5 className="font-bold text-gray-600 mb-2">Question Prompt</h5>
                            <p className="p-3 bg-gray-100 rounded-md border text-gray-700">{testContent.writing.task1.prompt}</p>
                          </div>
                          <div className="grid md:grid-cols-2 gap-6">
                              <div>
                                  <h5 className="font-bold text-gray-600 mb-2">Your Answer</h5>
                                  <div className="bg-gray-100 p-4 rounded-md border h-full whitespace-pre-wrap text-sm">{userAnswers.writing.task1 || "No answer provided."}</div>
                              </div>
                              <div>
                                  <h5 className="font-bold text-green-700 mb-2">Band 7.5 Model Answer</h5>
                                  <div className="bg-green-50 p-4 rounded-md border border-green-200 h-full whitespace-pre-wrap text-sm">{evaluation.improvedAnswers.writingTask1}</div>
                              </div>
                          </div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-sm">
                          <h4 className="text-lg font-semibold text-gray-800 mb-2">Writing Task 2</h4>
                          <div className="mb-4">
                            <h5 className="font-bold text-gray-600 mb-2">Question Prompt</h5>
                            <p className="p-3 bg-gray-100 rounded-md border text-gray-700">{testContent.writing.task2}</p>
                          </div>
                          <div className="grid md:grid-cols-2 gap-6">
                              <div>
                                  <h5 className="font-bold text-gray-600 mb-2">Your Answer</h5>
                                  <div className="bg-gray-100 p-4 rounded-md border h-full whitespace-pre-wrap text-sm">{userAnswers.writing.task2 || "No answer provided."}</div>
                              </div>
                              <div>
                                  <h5 className="font-bold text-green-700 mb-2">Band 7.5 Model Answer</h5>
                                  <div className="bg-green-50 p-4 rounded-md border border-green-200 h-full whitespace-pre-wrap text-sm">{evaluation.improvedAnswers.writingTask2}</div>
                              </div>
                          </div>
                        </div>
                        {evaluation.improvedAnswers.speaking.map((item, index) => (
                            <AnswerComparison key={index} title={`Speaking Question: "${item.question}"`} original={userAnswers.speaking[index]?.answer} improved={item.improvedAnswer} />
                        ))}
                    </div>
                </div>
            )}
          </>
        )}

        {practicePlan && practicePlan.length > 0 && (
          <div className="bg-blue-50 p-8 rounded-2xl border border-blue-200">
            <h2 className="text-3xl font-bold text-center mb-6 text-blue-800">Your Personalized Practice Plan to Reach Band 7.5</h2>
            <div className="space-y-6">
              {practicePlan.map((item, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-blue-700 mb-2">{item.title}</h3>
                  <p className="font-medium text-gray-500 mb-2">Focus Area: {item.area}</p>
                  <p className="text-gray-600 mb-4">{item.description}</p>
                  <div className="bg-gray-100 p-4 rounded-md border border-gray-200">
                    <p className="font-semibold text-gray-800 mb-2">Exercise:</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{item.exercise}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="text-center mt-12 flex flex-col sm:flex-row justify-center items-center gap-4">
        <button
          onClick={onRestart}
          className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors duration-300 shadow-md text-xl w-full sm:w-auto"
        >
          Take Another Test
        </button>
        <button
          onClick={handleSaveAsPdf}
          disabled={!isPdfReady || isGeneratingPdf}
          className="bg-gray-700 text-white font-bold py-3 px-8 rounded-lg hover:bg-gray-800 transition-colors duration-300 shadow-md text-xl w-full sm:w-auto disabled:bg-gray-400 disabled:cursor-wait"
        >
          {getPdfButtonText()}
        </button>
        <button
          onClick={handleSaveAsMarkdown}
          className="bg-teal-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-teal-700 transition-colors duration-300 shadow-md text-xl w-full sm:w-auto"
        >
          Download as Text
        </button>
      </div>
    </div>
  );
};

export default EvaluationScreen;
