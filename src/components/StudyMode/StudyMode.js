import React, { useState, useEffect } from 'react';
import CodeEditor from '../CodeEditor/CodeEditor';
import SpacedRepetition from '../SRS/SpacedRepetition';
import { db } from '../../firebase/firebaseConfig';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import './StudyMode.css';

const StudyMode = ({ userId, deckId }) => {
  const [cards, setCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userCode, setUserCode] = useState('');
  const [feedback, setFeedback] = useState('');
  const [srs] = useState(new SpacedRepetition(userId));
  const [stats, setStats] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (userId && deckId) {
      loadDeckAndCards();
    }
  }, [userId, deckId]);

  const loadDeckAndCards = async () => {
    try {
      const deckRef = doc(db, `users/${userId}/decks/${deckId}`);
      const deckDoc = await getDoc(deckRef);

      if (!deckDoc.exists()) {
        setError('Deck not found');
        return;
      }

      setDeckName(deckDoc.data().name);

      const cardsRef = collection(deckRef, 'cards');
      const snapshot = await getDocs(cardsRef);

      if (snapshot.empty) {
        setError('No cards found in this deck');
        return;
      }

      const dueCards = await srs.getDueCards(deckId);

      const allCards = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          progress: dueCards.find(c => c.cardId === doc.id)
        }))
        .filter(card => !card.progress || new Date(card.progress.nextReview) <= new Date());

      setCards(allCards);
      setError('');
    } catch (error) {
      console.error('Error loading deck and cards:', error);
      setError('Failed to load deck content. Please try again.');
    }
  };

  const loadCardStats = async () => {
    if (!cards.length) return;
    const currentCard = cards[currentCardIndex];
    try {
      const cardStats = await srs.getCardStats(currentCard.id);
      setStats(cardStats);
    } catch (error) {
      console.error('Error loading card stats:', error);
      setError('Failed to load card statistics');
    }
  };

  useEffect(() => {
    loadCardStats();
  }, [currentCardIndex, cards]);

  const handleAnswer = async (wasSuccessful) => {
    const currentCard = cards[currentCardIndex];
    try {
      await srs.updateCardProgress(deckId, currentCard.id, wasSuccessful);

      setFeedback(wasSuccessful ? 'Correct! Well done!' : 'Not quite right. Try again!');
      setTimeout(() => {
        setFeedback('');
        if (wasSuccessful) {
          handleNext();
          setShowAnswer(false);
          setUserCode('');
        }
      }, 1500);
    } catch (error) {
      console.error('Error updating progress:', error);
      setError('Failed to update progress');
    }
  };

  const normalizeCode = (code) => {
    return code
      // Remove all whitespace
      .replace(/\s+/g, '')
      // Remove all comments (both single and multi-line)
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
      // Normalize function declarations
      .replace(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, 'function')
      // Normalize variable declarations
      .replace(/(?:let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, 'let')
      // Remove semicolons
      .replace(/;/g, '')
      // Remove parentheses in simple cases
      .replace(/\(\)/g, '')
      // Convert to lowercase
      .toLowerCase();
  };

  const checkCodeSolution = () => {
    const currentCard = cards[currentCardIndex];

    try {
      // First try exact match after normalization
      const normalizedUserCode = normalizeCode(userCode);
      const normalizedSolution = normalizeCode(currentCard.solution);

      // Check if the codes are equivalent after normalization
      let isCorrect = normalizedUserCode === normalizedSolution;

      if (!isCorrect) {
        // If not exact match, try to evaluate the code behavior
        try {
          // Create a sandbox environment to test both codes
          const createSandbox = (code) => {
            let sandbox = {};
            // Add any necessary global objects or functions needed for testing
            const context = {
              console: { log: (...args) => sandbox.output.push(args) },
              Array: Array,
              Object: Object,
              String: String,
              Number: Number,
              Boolean: Boolean,
              Math: Math,
            };

            sandbox.output = [];

            // Execute the code in the sandbox
            const fn = new Function('context', `
              with(context) {
                ${code}
              }
              return context;
            `);

            try {
              fn(context);
            } catch (e) {
              sandbox.error = e;
            }

            return sandbox;
          };

          // Execute both solutions in sandbox
          const userResult = createSandbox(userCode);
          const solutionResult = createSandbox(currentCard.solution);

          // Compare outputs
          isCorrect = JSON.stringify(userResult.output) === JSON.stringify(solutionResult.output) &&
            !userResult.error && !solutionResult.error;
        } catch (e) {
          console.error('Error evaluating code behavior:', e);
          // If behavior evaluation fails, fall back to normalized comparison
          isCorrect = false;
        }
      }

      setShowAnswer(true);
      handleAnswer(isCorrect);
    } catch (error) {
      console.error('Error checking solution:', error);
      setError('Failed to check solution');
    }
  };

  const handleNext = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
      setUserCode('');
      setError('');
    } else {
      loadDeckAndCards();
      setCurrentCardIndex(0);
    }
  };

  const handlePrevious = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setShowAnswer(false);
      setUserCode('');
      setError('');
    }
  };

  if (error) {
    return <div className="study-mode error-message">{error}</div>;
  }

  if (!cards.length) {
    return (
      <div className="study-mode">
        <h2>All Caught Up! 🎉</h2>
        <p className="challenge-description">No cards are due for review at this time. Check back later!</p>
      </div>
    );
  }

  const currentCard = cards[currentCardIndex];
  const progressPercentage = ((currentCardIndex + 1) / cards.length) * 100;

  return (
    <div className="study-mode">
      {stats && (
        <div className="card-stats">
          <h2>{deckName}</h2>
          <div className="stat-item success-stat">
            <div className="stat-label">Success</div>
            <div className="stat-value">{stats.successRate}%</div>
          </div>
        </div>
      )}

      <div className="card-progress">
        <div className="progress-indicator">
          <span>{currentCardIndex + 1} / {cards.length}</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="card-content">
        <h3>{currentCard.title}</h3>
        <p className="challenge-description">{currentCard.description}</p>

        <CodeEditor
          code={showAnswer ? currentCard.solution : userCode}
          onChange={setUserCode}
          readOnly={showAnswer}
          placeholder="Write your solution here..."
        />

        <button
          className="auth-button"
          onClick={showAnswer ? () => {
            setShowAnswer(false);
            setUserCode('');
          } : checkCodeSolution}
        >
          {showAnswer ? 'Try Again' : 'Check Solution'}
        </button>

        {showAnswer && (
          <div className="solution">
            <h4>Solution:</h4>
          </div>
        )}

        {feedback && (
          <div className={`feedback ${feedback.includes('Correct') ? 'success' : 'error'}`}>
            {feedback}
          </div>
        )}
      </div>

      <div className="navigation-controls">
        <button
          onClick={handlePrevious}
          disabled={currentCardIndex === 0}
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          disabled={currentCardIndex === cards.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default StudyMode;
