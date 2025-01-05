// Элементы интерфейса
const characterCircle = document.querySelector('.character-circle');
const balanceAmount = document.getElementById('balance-amount');
const currentEnergy = document.getElementById('current-energy');
const maxEnergy = document.getElementById('max-energy');
const energyFill = document.querySelector('.energy-fill');
const usernameElement = document.getElementById('username');

// Состояние игры
let gameState = {
    balance: 0,
    energy: 100,
    maxEnergy: 100,
    clickPower: 5,
    energyCost: 5
};

// Загрузка данных пользователя
async function loadUserData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const { data, error } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('username', currentUser.username)
            .single();

        if (error) throw error;

        if (data) {
            gameState.balance = data.coins || 0;
            usernameElement.textContent = data.username;
            updateUI();
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        if (error.message === 'Invalid API key') {
            window.location.href = 'index.html';
        }
    }
}

// Обновление интерфейса
function updateUI() {
    balanceAmount.textContent = Math.floor(gameState.balance);
    currentEnergy.textContent = gameState.energy;
    maxEnergy.textContent = gameState.maxEnergy;
    energyFill.style.width = `${(gameState.energy / gameState.maxEnergy) * 100}%`;
}

// Обработка клика по персонажу
async function handleCharacterClick() {
    if (gameState.energy < gameState.energyCost) return;

    gameState.energy = Math.max(0, gameState.energy - gameState.energyCost);
    gameState.balance += gameState.clickPower;

    // Обновляем данные в базе
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const { error } = await window.supabaseClient
            .from('profiles')
            .update({
                coins: Math.floor(gameState.balance),
                updated_at: new Date().toISOString()
            })
            .eq('username', currentUser.username);

        if (error) throw error;
    } catch (error) {
        console.error('Ошибка обновления данных:', error);
    }

    updateUI();
}

// Восстановление энергии
setInterval(() => {
    if (gameState.energy < gameState.maxEnergy) {
        gameState.energy = Math.min(gameState.maxEnergy, gameState.energy + 1);
        updateUI();
    }
}, 1000);

// Навигация
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navItems.forEach(btn => btn.classList.remove('active'));
        item.classList.add('active');
    });
});

// Инициализация игры
characterCircle.addEventListener('click', handleCharacterClick);
loadUserData();
