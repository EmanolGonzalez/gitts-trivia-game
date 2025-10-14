import { ref } from 'vue';

const usedQuestions = ref<string[]>([]);

export async function fetchUsedQuestions(): Promise<string[]> {
  try {
    const response = await fetch('/data/used-questions.json');
    if (!response.ok) throw new Error('Failed to fetch used questions');
    const data = await response.json();
    usedQuestions.value = data.usedQuestions || [];
  } catch (error) {
    console.error('Error fetching used questions:', error);
  }
  return usedQuestions.value;
}

export async function saveUsedQuestions(newQuestions: string[]): Promise<void> {
  try {
    const updatedQuestions = Array.from(new Set([...usedQuestions.value, ...newQuestions]));
    usedQuestions.value = updatedQuestions;

    // Simulate saving to a server or local file
    await fetch('/data/used-questions.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usedQuestions: updatedQuestions }),
    });
  } catch (error) {
    console.error('Error saving used questions:', error);
  }
}