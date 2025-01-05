// Инициализация Supabase
const supabaseUrl = 'https://hzsctjmzqjsgmjigshwd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6c2N0am16cWpzZ21qaWdzaHdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYwMzg1MTYsImV4cCI6MjA1MTYxNDUxNn0.OVBvyWchb8yAi-xDAl5PTVks2YUD7DsYN3cVW-Gjuh4';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Игровые переменные
let balance = 0;
let clickPower = 1;
let currentUser = null;
let currentEnergy = 100;
let maxEnergy = 100;
let energyRegenInterval;

// Инициализация игры
async function initGame() {
    // Получаем данные пользователя из localStorage
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }

    currentUser = JSON.parse(userData);
    
    // Устанавливаем имя пользователя
    document.getElementById('username').textContent = currentUser.username;
    
    try {
        // Проверяем существование профиля и создаем его при необходимости
        let { data: existingProfile, error: checkError } = await supabaseClient
            .from('profiles')
            .select()
            .eq('username', currentUser.username)
            .maybeSingle();

        if (!existingProfile) {
            // Профиль не найден, создаем новый
            const { data: newProfile, error: createError } = await supabaseClient
                .from('profiles')
                .insert({
                    username: currentUser.username,
                    user_password: currentUser.user_password,
                    balance: 0,
                    click_power: 1,
                    total_clicks: 0,
                    energy: maxEnergy
                })
                .select()
                .single();

            if (createError) throw createError;
            currentUser = newProfile;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } else {
            currentUser = existingProfile;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }

        // Устанавливаем значения из профиля
        balance = currentUser.balance || 0;
        clickPower = currentUser.click_power || 1;
        currentEnergy = currentUser.energy || maxEnergy;
        updateBalance();
        updateEnergy();
        
        // Запускаем регенерацию энергии
        startEnergyRegeneration();
    } catch (error) {
        console.error('Ошибка загрузки баланса:', error);
    }
}

// Обновление баланса
function updateBalance() {
    const balanceElement = document.getElementById('balance');
    balanceElement.textContent = balance;
    balanceElement.classList.add('balance-increase');
    setTimeout(() => balanceElement.classList.remove('balance-increase'), 300);
}

// Обновление энергии
function updateEnergy() {
    const energyFill = document.getElementById('energyFill');
    const currentEnergyElement = document.getElementById('currentEnergy');
    const energyPercentage = (currentEnergy / maxEnergy) * 100;
    
    energyFill.style.width = `${energyPercentage}%`;
    currentEnergyElement.textContent = Math.floor(currentEnergy);
    
    // Добавляем или убираем класс low-energy
    if (energyPercentage <= 20) {
        energyFill.classList.add('energy-low');
    } else {
        energyFill.classList.remove('energy-low');
    }
}

// Регенерация энергии
function startEnergyRegeneration() {
    // Очищаем предыдущий интервал, если он существует
    if (energyRegenInterval) {
        clearInterval(energyRegenInterval);
    }
    
    // Регенерация энергии каждые 3 секунды
    energyRegenInterval = setInterval(() => {
        if (currentEnergy < maxEnergy) {
            currentEnergy = Math.min(maxEnergy, currentEnergy + 1);
            updateEnergy();
            
            // Сохраняем значение энергии в базе данных
            supabaseClient
                .from('profiles')
                .update({ energy: currentEnergy })
                .eq('username', currentUser.username);
        }
    }, 3000);
}

// Обработка клика
async function handleClick() {
    // Проверяем, есть ли энергия
    if (currentEnergy < 1) {
        return;
    }
    
    // Уменьшаем энергию и увеличиваем баланс
    currentEnergy--;
    balance += clickPower;
    
    // Обновляем интерфейс
    updateBalance();
    updateEnergy();
    
    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({
                balance: balance,
                energy: currentEnergy,
                total_clicks: (currentUser.total_clicks || 0) + 1
            })
            .eq('username', currentUser.username);
            
        if (error) throw error;
        
        // Обновляем данные в localStorage
        currentUser.balance = balance;
        currentUser.energy = currentEnergy;
        currentUser.total_clicks = (currentUser.total_clicks || 0) + 1;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
    }
}

// Навигация между секциями
function switchSection(sectionId) {
    // Скрываем все секции
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Показываем выбранную секцию
    document.getElementById(sectionId).classList.add('active');
    
    // Обновляем активную кнопку навигации
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
}

// Обработчики событий
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    
    // Клик по кнопке
    document.getElementById('clickerButton').addEventListener('click', handleClick);
    
    // Клик по аватару для открытия настроек
    document.getElementById('userAvatar').addEventListener('click', toggleSettings);
    
    // Загружаем сохраненные настройки
    loadSettings();
    
    // Навигация
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            switchSection(section);
        });
    });
    
    // Запускаем снег сразу после загрузки страницы
    snowfall.start();
});

// Функции для работы с настройками
function toggleSettings() {
    const overlay = document.getElementById('settingsOverlay');
    if (overlay) {
        overlay.classList.toggle('active');
    }
}

function loadSettings() {
    try {
        // Загружаем сохраненные настройки из localStorage
        const settings = JSON.parse(localStorage.getItem('gameSettings') || '{}');
        
        // Устанавливаем значения переключателей
        const soundToggle = document.getElementById('soundToggle');
        const musicToggle = document.getElementById('musicToggle');
        const notificationsToggle = document.getElementById('notificationsToggle');
        const snowToggle = document.getElementById('snowToggle');
        
        if (soundToggle) soundToggle.checked = settings.sound ?? true;
        if (musicToggle) musicToggle.checked = settings.music ?? true;
        if (notificationsToggle) notificationsToggle.checked = settings.notifications ?? true;
        if (snowToggle) {
            // Снег включен по умолчанию
            snowToggle.checked = settings.snow ?? true;
        }
        
        // Запускаем снег при загрузке страницы
        if (!settings.hasOwnProperty('snow') || settings.snow) {
            snowfall.start();
        }
        
        // Добавляем обработчики изменений
        ['sound', 'music', 'notifications'].forEach(setting => {
            const toggle = document.getElementById(`${setting}Toggle`);
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    const settings = JSON.parse(localStorage.getItem('gameSettings') || '{}');
                    settings[setting] = e.target.checked;
                    localStorage.setItem('gameSettings', JSON.stringify(settings));
                });
            }
        });

        // Добавляем обработчик для снега
        if (snowToggle) {
            snowToggle.addEventListener('change', (e) => {
                const settings = JSON.parse(localStorage.getItem('gameSettings') || '{}');
                settings.snow = e.target.checked;
                localStorage.setItem('gameSettings', JSON.stringify(settings));
                
                if (e.target.checked) {
                    snowfall.start();
                } else {
                    snowfall.stop();
                }
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
    }
}

// Функция выхода из аккаунта
async function logout() {
    try {
        // Очищаем данные пользователя
        localStorage.removeItem('currentUser');
        localStorage.removeItem('gameSettings');
        
        // Очищаем интервал регенерации энергии
        if (energyRegenInterval) {
            clearInterval(energyRegenInterval);
        }
        
        // Перенаправляем на страницу входа
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Ошибка при выходе:', error);
    }
}

// Закрытие настроек при клике вне окна
document.addEventListener('click', (e) => {
    const overlay = document.getElementById('settingsOverlay');
    const settingsPanel = document.querySelector('.settings-panel');
    const avatar = document.getElementById('userAvatar');
    
    if (overlay && overlay.classList.contains('active')) {
        if (!settingsPanel.contains(e.target) && e.target !== avatar) {
            overlay.classList.remove('active');
        }
    }
});

// Очистка интервала при уходе со страницы
window.addEventListener('beforeunload', () => {
    if (energyRegenInterval) {
        clearInterval(energyRegenInterval);
    }
});

// Обновляем app.js, чтобы после успешного входа перенаправлять на game.html
function redirectToGame() {
    window.location.href = 'game.html';
}
