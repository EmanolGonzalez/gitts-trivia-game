// Trivia Questions Database
const triviaQuestions = [
    {
        question: "¿Cuál es la capital de España?",
        answers: ["Madrid", "Barcelona", "Valencia", "Sevilla"],
        correct: 0
    },
    {
        question: "¿En qué año se descubrió América?",
        answers: ["1492", "1500", "1482", "1520"],
        correct: 0
    },
    {
        question: "¿Cuál es el planeta más grande del sistema solar?",
        answers: ["Tierra", "Marte", "Júpiter", "Saturno"],
        correct: 2
    },
    {
        question: "¿Quién escribió 'Don Quijote de la Mancha'?",
        answers: ["Miguel de Cervantes", "Lope de Vega", "Federico García Lorca", "Gabriel García Márquez"],
        correct: 0
    },
    {
        question: "¿Cuántos continentes hay en la Tierra?",
        answers: ["5", "6", "7", "8"],
        correct: 2
    },
    {
        question: "¿Cuál es el océano más grande?",
        answers: ["Atlántico", "Índico", "Ártico", "Pacífico"],
        correct: 3
    },
    {
        question: "¿En qué país se encuentra la Torre Eiffel?",
        answers: ["Italia", "Francia", "Alemania", "Inglaterra"],
        correct: 1
    },
    {
        question: "¿Cuál es el río más largo del mundo?",
        answers: ["Nilo", "Amazonas", "Yangtsé", "Misisipi"],
        correct: 0
    },
    {
        question: "¿Cuántos jugadores hay en un equipo de fútbol?",
        answers: ["9", "10", "11", "12"],
        correct: 2
    },
    {
        question: "¿Cuál es el elemento químico con símbolo 'O'?",
        answers: ["Oro", "Oxígeno", "Osmio", "Ozono"],
        correct: 1
    }
];

// Game State
let currentQuestionIndex = 0;
let score = 0;
let questions = [];

// DOM Elements
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');
const startBtn = document.getElementById('start-btn');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');
const questionElement = document.getElementById('question');
const answersElement = document.getElementById('answers');
const questionNumberElement = document.getElementById('question-number');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('final-score');
const performanceMessageElement = document.getElementById('performance-message');

// Event Listeners
startBtn.addEventListener('click', startGame);
nextBtn.addEventListener('click', nextQuestion);
restartBtn.addEventListener('click', restartGame);

// Game Functions
function startGame() {
    // Reset game state
    currentQuestionIndex = 0;
    score = 0;
    
    // Shuffle questions
    questions = shuffleArray([...triviaQuestions]);
    
    // Update UI
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    // Load first question
    loadQuestion();
}

function loadQuestion() {
    // Hide next button
    nextBtn.classList.add('hidden');
    
    // Get current question
    const currentQuestion = questions[currentQuestionIndex];
    
    // Update question number and score
    questionNumberElement.textContent = `${currentQuestionIndex + 1}/${questions.length}`;
    scoreElement.textContent = score;
    
    // Display question
    questionElement.textContent = currentQuestion.question;
    
    // Clear previous answers
    answersElement.innerHTML = '';
    
    // Create answer buttons
    currentQuestion.answers.forEach((answer, index) => {
        const button = document.createElement('button');
        button.textContent = answer;
        button.classList.add('answer-btn');
        button.addEventListener('click', () => selectAnswer(index));
        answersElement.appendChild(button);
    });
}

function selectAnswer(selectedIndex) {
    const currentQuestion = questions[currentQuestionIndex];
    const answerButtons = document.querySelectorAll('.answer-btn');
    
    // Disable all buttons
    answerButtons.forEach(btn => {
        btn.classList.add('disabled');
        btn.style.pointerEvents = 'none';
    });
    
    // Check if answer is correct
    if (selectedIndex === currentQuestion.correct) {
        answerButtons[selectedIndex].classList.add('correct');
        score++;
        scoreElement.textContent = score;
    } else {
        answerButtons[selectedIndex].classList.add('incorrect');
        answerButtons[currentQuestion.correct].classList.add('correct');
    }
    
    // Show next button or finish game
    if (currentQuestionIndex < questions.length - 1) {
        nextBtn.classList.remove('hidden');
    } else {
        setTimeout(finishGame, 1500);
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    loadQuestion();
}

function finishGame() {
    // Hide game screen
    gameScreen.classList.add('hidden');
    
    // Show result screen
    resultScreen.classList.remove('hidden');
    
    // Display final score
    finalScoreElement.textContent = `${score}/${questions.length}`;
    
    // Display performance message
    const percentage = (score / questions.length) * 100;
    let message = '';
    
    if (percentage === 100) {
        message = '¡Perfecto! 🎉 ¡Eres un experto!';
    } else if (percentage >= 80) {
        message = '¡Excelente trabajo! 🌟';
    } else if (percentage >= 60) {
        message = '¡Bien hecho! 👍';
    } else if (percentage >= 40) {
        message = '¡Puedes hacerlo mejor! 💪';
    } else {
        message = '¡Sigue intentando! 📚';
    }
    
    performanceMessageElement.textContent = message;
}

function restartGame() {
    // Hide result screen
    resultScreen.classList.add('hidden');
    
    // Show start screen
    startScreen.classList.remove('hidden');
}

// Utility Functions
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}
