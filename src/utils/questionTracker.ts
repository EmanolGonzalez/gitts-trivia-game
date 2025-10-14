import { ref } from 'vue';

const usedQuestions = ref<string[]>([]);

export async function fetchUsedQuestions(): Promise<string[]> {
  try {
    // Check localStorage first
    const localData = localStorage.getItem('usedQuestions');
    if (localData) {
      usedQuestions.value = JSON.parse(localData);
      return usedQuestions.value;
    }

    // If no data in localStorage, initialize as empty
    usedQuestions.value = [];
  } catch (error) {
    console.error('Error fetching used questions from localStorage:', error);
  }
  return usedQuestions.value;
}

export async function saveUsedQuestions(newQuestions: string[]): Promise<void> {
  try {
    const updatedQuestions = Array.from(new Set([...usedQuestions.value, ...newQuestions]));
    usedQuestions.value = updatedQuestions;

    // Save to localStorage
    localStorage.setItem('usedQuestions', JSON.stringify(updatedQuestions));
  } catch (error) {
    console.error('Error saving used questions to localStorage:', error);
  }
}
