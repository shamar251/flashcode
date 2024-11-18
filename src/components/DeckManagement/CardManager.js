import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import CodeEditor from '../CodeEditor/CodeEditor';
import './CardManager.css';

const CardManager = ({ userId, deckId, onCardAdded, editingCard = null }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [solution, setSolution] = useState('');
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (editingCard) {
      setTitle(editingCard.title);
      setDescription(editingCard.description);
      setSolution(editingCard.solution);
      setIsEditing(true);
    } else {
      resetForm();
    }
  }, [editingCard]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSolution('');
    setIsEditing(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !solution.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      if (isEditing && editingCard) {
        // Update existing card
        const cardRef = doc(db, `users/${userId}/decks/${deckId}/cards/${editingCard.id}`);
        await updateDoc(cardRef, {
          title: title.trim(),
          description: description.trim(),
          solution: solution.trim(),
          updatedAt: new Date().toISOString()
        });
      } else {
        // Create new card
        const cardsRef = collection(db, `users/${userId}/decks/${deckId}/cards`);
        await addDoc(cardsRef, {
          title: title.trim(),
          description: description.trim(),
          solution: solution.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      resetForm();
      if (onCardAdded) {
        onCardAdded();
      }
    } catch (error) {
      console.error('Error saving card:', error);
      setError(`Failed to ${isEditing ? 'update' : 'add'} card. Please try again.`);
    }
  };

  const handleCancel = () => {
    resetForm();
    if (onCardAdded) {
      onCardAdded();
    }
  };

  return (
    <div className="card-manager">
      <h3>{isEditing ? 'Edit Card' : 'Add New Card'}</h3>
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="card-form">
        <div className="form-group">
          <label htmlFor="title">Title:</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Python List Comprehension"
            className="auth-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain the concept or provide instructions..."
            className="auth-input"
            rows="3"
          />
        </div>

        <div className="form-group">
          <label htmlFor="solution">Solution:</label>
          <CodeEditor
            code={solution}
            onChange={setSolution}
            placeholder="Write the solution code here..."
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="auth-button">
            {isEditing ? 'Update Card' : 'Add Card'}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={handleCancel}
              className="auth-button cancel"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default CardManager;
