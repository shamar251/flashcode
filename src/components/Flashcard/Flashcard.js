import React, { useState } from 'react';
import CodeEditor from '../CodeEditor/CodeEditor';

const sampleChallenges = [
  {
    id: 1,
    title: 'Variable Declaration',
    description: 'Declare a constant variable named "greeting" with the value "Hello, World!"',
    solution: 'const greeting = "Hello, World!";',
    hint: 'Use the "const" keyword to declare a constant variable'
  },
  {
    id: 2,
    title: 'Array Methods',
    description: 'Create an array of numbers [1,2,3,4,5] and use map to multiply each number by 2',
    solution: 'const numbers = [1,2,3,4,5];\nconst doubled = numbers.map(num => num * 2);',
    hint: 'Use the array map() method with an arrow function'
  },
  {
    id: 3,
    title: 'Function Declaration',
    description: 'Create a function named "add" that takes two parameters and returns their sum',
    solution: 'function add(a, b) {\n  return a + b;\n}',
    hint: 'Use the "function" keyword followed by the function name and parameters'
  }
];

const Flashcard = () => {
  const [currentCard, setCurrentCard] = useState(0);
  const [userCode, setUserCode] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [completed, setCompleted] = useState([]);

  const checkSolution = () => {
    // Remove whitespace and newlines for comparison
    const normalizedUserCode = userCode.replace(/\s/g, '');
    const normalizedSolution = sampleChallenges[currentCard].solution.replace(/\s/g, '');

    if (normalizedUserCode === normalizedSolution) {
      if (!completed.includes(currentCard)) {
        setCompleted([...completed, currentCard]);
      }
      return true;
    }
    return false;
  };

  const handleNext = () => {
    if (currentCard < sampleChallenges.length - 1) {
      setCurrentCard(currentCard + 1);
      setUserCode('');
      setShowHint(false);
    }
  };

  const handlePrevious = () => {
    if (currentCard > 0) {
      setCurrentCard(currentCard - 1);
      setUserCode('');
      setShowHint(false);
    }
  };

  const progress = (completed.length / sampleChallenges.length) * 100;

  return (
    <div className="flashcard">
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <h3>{sampleChallenges[currentCard].title}</h3>
      <p className="challenge-description">
        {sampleChallenges[currentCard].description}
      </p>

      <CodeEditor
        code={userCode}
        onChange={setUserCode}
        placeholder="Write your solution here..."
      />

      <div className="flashcard-controls">
        <button
          onClick={handlePrevious}
          disabled={currentCard === 0}
          className="auth-button"
        >
          Previous
        </button>

        <button
          onClick={() => setShowHint(true)}
          className="auth-button"
        >
          Show Hint
        </button>

        <button
          onClick={checkSolution}
          className="auth-button"
        >
          Check Solution
        </button>

        <button
          onClick={handleNext}
          disabled={currentCard === sampleChallenges.length - 1}
          className="auth-button"
        >
          Next
        </button>
      </div>

      {showHint && (
        <div className="hint">
          <strong>Hint:</strong> {sampleChallenges[currentCard].hint}
        </div>
      )}
    </div>
  );
};

export default Flashcard;
