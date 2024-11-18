import { db } from '../../firebase/firebaseConfig';
import { doc, updateDoc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

// SRS Levels and their intervals (in hours)
const SRS_LEVELS = {
  0: 0,      // New card
  1: 4,      // 4 hours
  2: 8,      // 8 hours
  3: 24,     // 1 day
  4: 72,     // 3 days
  5: 168,    // 1 week
  6: 336,    // 2 weeks
  7: 730,    // 1 month
  8: 2190,   // 3 months
};

class SpacedRepetition {
  constructor(userId) {
    this.userId = userId;
  }

  // Calculate next review time based on current level and success
  calculateNextReview(currentLevel, wasSuccessful) {
    let newLevel;

    if (wasSuccessful) {
      // Move up a level if successful, max level is 8
      newLevel = Math.min(currentLevel + 1, 8);
    } else {
      // Move down two levels if failed, minimum level is 1
      newLevel = Math.max(currentLevel - 2, 1);
    }

    const intervalHours = SRS_LEVELS[newLevel];
    const nextReview = new Date();
    nextReview.setHours(nextReview.getHours() + intervalHours);

    return {
      level: newLevel,
      nextReview: nextReview.toISOString()
    };
  }

  // Update card progress in Firestore
  async updateCardProgress(deckId, cardId, wasSuccessful) {
    try {
      const progressRef = doc(db, `users/${this.userId}/progress/${deckId}_${cardId}`);
      const progressDoc = await getDoc(progressRef);

      let currentLevel = 0;
      let totalReviews = 0;
      let successfulReviews = 0;

      if (progressDoc.exists()) {
        const data = progressDoc.data();
        currentLevel = data.level || 0;
        totalReviews = data.totalReviews || 0;
        successfulReviews = data.successfulReviews || 0;
      }

      const { level, nextReview } = this.calculateNextReview(currentLevel, wasSuccessful);

      await setDoc(progressRef, {
        deckId,
        cardId,
        level,
        nextReview,
        lastReviewed: new Date().toISOString(),
        totalReviews: totalReviews + 1,
        successfulReviews: successfulReviews + (wasSuccessful ? 1 : 0)
      });

      return { level, nextReview };
    } catch (error) {
      console.error('Error updating card progress:', error);
      throw error;
    }
  }

  // Get due cards for review
  async getDueCards(deckId) {
    try {
      const progressRef = collection(db, `users/${this.userId}/progress`);
      const q = query(progressRef, where('deckId', '==', deckId));
      const snapshot = await getDocs(q);

      const now = new Date().toISOString();
      const cards = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(card => !card.nextReview || card.nextReview <= now);

      return cards;
    } catch (error) {
      console.error('Error getting due cards:', error);
      throw error;
    }
  }

  // Get card statistics
  async getCardStats(cardId) {
    try {
      const progressRef = collection(db, `users/${this.userId}/progress`);
      const q = query(progressRef, where('cardId', '==', cardId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return {
          level: 0,
          totalReviews: 0,
          successRate: 0
        };
      }

      const data = snapshot.docs[0].data();
      const successRate = data.totalReviews > 0
        ? (data.successfulReviews / data.totalReviews) * 100
        : 0;

      return {
        level: data.level || 0,
        totalReviews: data.totalReviews || 0,
        successRate: Math.round(successRate)
      };
    } catch (error) {
      console.error('Error getting card stats:', error);
      throw error;
    }
  }

  // Reset card progress
  async resetCardProgress(deckId, cardId) {
    try {
      const progressRef = doc(db, `users/${this.userId}/progress/${deckId}_${cardId}`);
      await setDoc(progressRef, {
        deckId,
        cardId,
        level: 0,
        nextReview: new Date().toISOString(),
        totalReviews: 0,
        successfulReviews: 0
      });
    } catch (error) {
      console.error('Error resetting card progress:', error);
      throw error;
    }
  }

  // Get deck statistics
  async getDeckStats(deckId) {
    try {
      const progressRef = collection(db, `users/${this.userId}/progress`);
      const q = query(progressRef, where('deckId', '==', deckId));
      const snapshot = await getDocs(q);

      let totalCards = 0;
      let completedCards = 0;
      let totalReviews = 0;
      let totalSuccessful = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        totalCards++;
        if (data.level >= 8) completedCards++;
        totalReviews += data.totalReviews || 0;
        totalSuccessful += data.successfulReviews || 0;
      });

      return {
        totalCards,
        completedCards,
        completionRate: totalCards > 0 ? (completedCards / totalCards) * 100 : 0,
        successRate: totalReviews > 0 ? (totalSuccessful / totalReviews) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting deck stats:', error);
      throw error;
    }
  }
}

export default SpacedRepetition;
