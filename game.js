// Игровые переменные
let currentEnergy = 100;
let maxEnergy = 100;
let energyRegenInterval;
let lastEnergyUpdate = Date.now();
let isUpdatingEnergy = false;

// Инициализация игры
async function initGame() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    // Устанавливаем имя пользователя
    document.getElementById('username').textContent = user.username;
    
    try {
        // Получаем актуальные данные из базы
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('username', user.username)
            .single();

        if (error) {
            handleSupabaseError(error, 'Ошибка загрузки профиля');
            return;
        }

        if (profile) {
            setCurrentUser(profile);
            
            // Инициализируем значения
            currentEnergy = profile.energy ?? maxEnergy;
            lastEnergyUpdate = new Date(profile.last_energy_update).getTime();
            
            // Обновляем интерфейс
            updateBalance();
            updateEnergy();
            startEnergyRegeneration();
        } else {
            logout();
        }
    } catch (error) {
        handleSupabaseError(error, 'Ошибка инициализации игры');
    }
}

// Обновление баланса
function updateBalance() {
    const balanceElement = document.getElementById('balance');
    if (currentUser && balanceElement) {
        balanceElement.textContent = currentUser.balance || 0;
        balanceElement.classList.add('balance-increase');
        setTimeout(() => balanceElement.classList.remove('balance-increase'), 300);
    }
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
    if (energyRegenInterval) {
        clearInterval(energyRegenInterval);
    }

    async function updateEnergyInDB() {
        if (isUpdatingEnergy || currentEnergy >= maxEnergy) return;
        
        try {
            isUpdatingEnergy = true;
            
            // Получаем актуальные данные из базы
            const { data: currentData, error: fetchError } = await supabaseClient
                .from('profiles')
                .select('energy, last_energy_update')
                .eq('username', currentUser.username)
                .single();

            if (fetchError) {
                handleSupabaseError(fetchError, 'Ошибка обновления энергии');
                return;
            }

            // Вычисляем, сколько энергии должно быть добавлено
            const timePassed = Math.floor((Date.now() - lastEnergyUpdate) / 1000);
            const energyToAdd = Math.min(timePassed, maxEnergy - currentEnergy);
            const newEnergy = Math.min(maxEnergy, currentEnergy + energyToAdd);

            if (newEnergy > currentData.energy) {
                // Обновляем значение в базе данных
                const { data, error } = await supabaseClient
                    .from('profiles')
                    .update({
                        energy: newEnergy,
                        last_energy_update: new Date().toISOString()
                    })
                    .eq('username', currentUser.username)
                    .select()
                    .single();

                if (error) {
                    handleSupabaseError(error, 'Ошибка обновления энергии');
                    return;
                }

                if (data) {
                    setCurrentUser({ ...currentUser, ...data });
                    currentEnergy = data.energy;
                    updateEnergy();
                }
            }

            lastEnergyUpdate = Date.now();
        } catch (error) {
            handleSupabaseError(error, 'Ошибка обновления энергии');
        } finally {
            isUpdatingEnergy = false;
        }
    }

    // Обновляем энергию каждую секунду
    energyRegenInterval = setInterval(() => {
        if (currentEnergy < maxEnergy) {
            // Обновляем локальное значение
            currentEnergy = Math.min(maxEnergy, currentEnergy + 1);
            updateEnergy();
            // Синхронизируем с базой данных
            updateEnergyInDB();
        }
    }, 1000);

    // Начальная синхронизация
    updateEnergyInDB();
}

// Функция для принудительной синхронизации энергии
async function syncEnergy() {
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('energy, last_energy_update')
            .eq('username', currentUser.username)
            .single();

        if (error) {
            handleSupabaseError(error, 'Ошибка синхронизации энергии');
            return;
        }

        if (data) {
            currentEnergy = data.energy;
            lastEnergyUpdate = new Date(data.last_energy_update).getTime();
            updateEnergy();
        }
    } catch (error) {
        handleSupabaseError(error, 'Ошибка синхронизации энергии');
    }
}

// Обработка клика
async function handleClick() {
    if (!currentUser || currentEnergy < 1) return;

    try {
        const clickPower = currentUser.click_power || 1;
        const newBalance = (currentUser.balance || 0) + clickPower;
        const newEnergy = Math.max(0, currentEnergy - 1);
        const newTotalClicks = (currentUser.total_clicks || 0) + 1;

        // Сначала обновляем локальные данные и интерфейс
        currentUser.balance = newBalance;
        currentUser.total_clicks = newTotalClicks;
        currentEnergy = newEnergy;
        
        // Обновляем интерфейс немедленно
        updateBalance();
        updateEnergy();

        // Затем отправляем данные в базу
        const { data, error } = await supabaseClient
            .from('profiles')
            .update({
                balance: newBalance,
                energy: newEnergy,
                last_energy_update: new Date().toISOString(),
                total_clicks: newTotalClicks
            })
            .eq('username', currentUser.username)
            .select()
            .single();
            
        if (error) {
            handleSupabaseError(error, 'Ошибка сохранения данных');
            // Откатываем изменения при ошибке
            currentUser.balance = data ? data.balance : currentUser.balance - clickPower;
            currentUser.total_clicks = data ? data.total_clicks : currentUser.total_clicks - 1;
            currentEnergy = data ? data.energy : currentEnergy + 1;
            updateBalance();
            updateEnergy();
            throw error;
        }

        // Обновляем данные из базы
        if (data) {
            setCurrentUser({ ...currentUser, ...data });
            currentEnergy = data.energy;
        }
        
        // Сохраняем в localStorage
        currentUser.last_energy_update = new Date().toISOString();
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } catch (error) {
        handleSupabaseError(error, 'Ошибка сохранения данных');
    }
}

// Навигация между секциями
function switchSection(sectionId) {
    // Скрываем все секции
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Показываем выбранную секцию
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add('active');
        
        // Если переключились на секцию Frens, обновляем список друзей
        if (sectionId === 'frensSection') {
            updateFriendsList();
        }
    }
    
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
    
    // Обработка видимости вкладки
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // При возврате на вкладку синхронизируем данные
            syncEnergy();
        }
    });
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

// Функция для получения текущего пользователя
function getCurrentUser() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        return JSON.parse(userData);
    } else {
        return null;
    }
}

// Функция для установки текущего пользователя
function setCurrentUser(user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
}

// Обновляем список друзей
function updateFriendsList() {
    // TODO: реализовать обновление списка друзей
}

// Обработчик ошибок Supabase
function handleSupabaseError(error, message) {
    console.error(message, error);
    showNotification(message, true);
}
