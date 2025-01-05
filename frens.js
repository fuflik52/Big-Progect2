let referralCode = '';

// Функция для инициализации системы Frens
async function initFrens() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        referralCode = await generateReferralCode(user.username);
        if (referralCode) {
            updateFriendsList();
        }
    } catch (error) {
        handleSupabaseError(error, 'Ошибка инициализации системы Frens');
    }
}

// Генерация реферального кода
async function generateReferralCode(username) {
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();

        if (error) {
            handleSupabaseError(error, 'Ошибка получения ID пользователя');
            return '';
        }

        return btoa(data.id).replace(/[^a-zA-Z0-9]/g, '');
    } catch (error) {
        handleSupabaseError(error, 'Ошибка генерации реферального кода');
        return '';
    }
}

// Обновление списка друзей
async function updateFriendsList() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        console.log('Текущий пользователь:', user);

        // Получаем список друзей
        const { data: friends, error } = await supabaseClient
            .from('user_friends')
            .select('id, friend_id')
            .eq('user_id', user.id);

        if (error) {
            console.error('Ошибка загрузки списка друзей:', error);
            handleSupabaseError(error, 'Ошибка загрузки списка друзей');
            return;
        }

        console.log('Загруженные друзья:', friends);

        // Обновляем счетчик друзей
        const friendListHeader = document.querySelector('.friend-list-header');
        if (friendListHeader) {
            friendListHeader.textContent = `Список друзей (${friends ? friends.length : 0})`;
        }

        // Если нет друзей, показываем сообщение
        const friendListContent = document.querySelector('.friend-list-content');
        if (!friends || friends.length === 0) {
            if (friendListContent) {
                friendListContent.innerHTML = '<div class="no-friends">У вас пока нет друзей</div>';
            }
            return;
        }

        // Получаем информацию о каждом друге
        const friendProfiles = await Promise.all(
            friends.map(async (friendship) => {
                console.log('Загрузка профиля для friend_id:', friendship.friend_id);
                const { data: profile, error: profileError } = await supabaseClient
                    .from('profiles')
                    .select('username, balance')
                    .eq('id', friendship.friend_id)
                    .single();

                if (profileError) {
                    console.error('Ошибка загрузки профиля друга:', profileError);
                    return null;
                }

                console.log('Загруженный профиль:', profile);
                return {
                    id: friendship.id,
                    username: profile.username,
                    balance: profile.balance || 0
                };
            })
        );

        console.log('Загруженные профили друзей:', friendProfiles);

        // Фильтруем null значения и обновляем список
        const validProfiles = friendProfiles.filter(profile => profile !== null);
        
        if (friendListContent) {
            if (validProfiles.length > 0) {
                friendListContent.innerHTML = validProfiles.map(friend => `
                    <div class="friend-item">
                        <div class="friend-info">
                            <span class="friend-name">${friend.username}</span>
                            <span class="friend-balance">${friend.balance} токенов</span>
                        </div>
                        <i class="fas fa-times friend-remove" onclick="removeFriend(${friend.id})"></i>
                    </div>
                `).join('');
            } else {
                friendListContent.innerHTML = '<div class="no-friends">Ошибка загрузки списка друзей</div>';
            }
        }
    } catch (error) {
        console.error('Ошибка обновления списка друзей:', error);
        handleSupabaseError(error, 'Ошибка загрузки списка друзей');
    }
}

// Удаление друга
async function removeFriend(friendshipId) {
    try {
        const { error } = await supabaseClient
            .from('user_friends')
            .delete()
            .eq('id', friendshipId);

        if (error) {
            console.error('Ошибка удаления друга:', error);
            handleSupabaseError(error, 'Ошибка удаления друга');
            return;
        }

        showNotification('Друг удален из списка');
        await updateFriendsList();
    } catch (error) {
        console.error('Ошибка при удалении друга:', error);
        handleSupabaseError(error, 'Ошибка удаления друга');
    }
}

// Добавление друга по имени
async function addFriend() {
    const user = getCurrentUser();
    if (!user) return;

    const friendUsernameInput = document.getElementById('friendUsername');
    const friendUsername = friendUsernameInput.value.trim();

    if (!friendUsername) {
        showNotification('Введите имя друга', true);
        return;
    }

    if (friendUsername === user.username) {
        showNotification('Вы не можете добавить себя в друзья', true);
        return;
    }

    try {
        console.log('Поиск пользователя:', friendUsername);

        // Проверяем существование пользователя
        const { data: users, error: userError } = await supabaseClient
            .from('profiles')
            .select('id, username')
            .eq('username', friendUsername);

        if (userError) {
            console.error('Ошибка поиска пользователя:', userError);
            showNotification('Ошибка при поиске пользователя', true);
            return;
        }

        if (!users || users.length === 0) {
            showNotification('Пользователь не найден', true);
            return;
        }

        const friendUser = users[0];
        console.log('Найден пользователь:', friendUser);

        // Проверяем, не является ли уже другом
        const { data: existingFriends, error: checkError } = await supabaseClient
            .from('user_friends')
            .select('id')
            .eq('user_id', user.id)
            .eq('friend_id', friendUser.id);

        if (checkError) {
            console.error('Ошибка проверки дружбы:', checkError);
            handleSupabaseError(checkError, 'Ошибка проверки дружбы');
            return;
        }

        if (existingFriends && existingFriends.length > 0) {
            showNotification('Этот пользователь уже в списке друзей', true);
            return;
        }

        // Добавляем друга
        const { error: addError } = await supabaseClient
            .from('user_friends')
            .insert([{
                user_id: user.id,
                friend_id: friendUser.id
            }]);

        if (addError) {
            console.error('Ошибка добавления друга:', addError);
            handleSupabaseError(addError, 'Ошибка добавления друга');
            return;
        }

        console.log('Друг успешно добавлен');

        // Очищаем поле ввода и обновляем список
        friendUsernameInput.value = '';
        showNotification(`Пользователь ${friendUser.username} добавлен в друзья!`);
        await updateFriendsList();

    } catch (error) {
        console.error('Ошибка при добавлении друга:', error);
        handleSupabaseError(error, 'Ошибка добавления друга');
    }
}

// Копирование имени пользователя
function copyUsername() {
    const user = getCurrentUser();
    if (!user) return;

    navigator.clipboard.writeText(user.username)
        .then(() => showNotification('Имя пользователя скопировано'))
        .catch(() => showNotification('Ошибка копирования', true));
}

// Копирование реферальной ссылки
function copyReferralLink() {
    const referralLink = `${window.location.origin}/index.html?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink)
        .then(() => showNotification('Ссылка скопирована!'))
        .catch(() => showNotification('Ошибка копирования ссылки', true));
}

// Обработка реферальной ссылки
async function handleReferral() {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    const user = getCurrentUser();
    
    if (!refCode || !user) return;

    try {
        // Декодируем ID пригласившего пользователя
        const referrerId = atob(refCode);

        // Проверяем, не пытается ли пользователь добавить сам себя
        if (referrerId === user.id) {
            showNotification('Вы не можете добавить себя в друзья');
            return;
        }
        
        // Проверяем, существует ли уже такая дружба
        const { data: existingFriend, error: checkError } = await supabaseClient
            .from('user_friends')
            .select('id')
            .match({
                user_id: referrerId,
                friend_id: user.id
            })
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            handleSupabaseError(checkError, 'Ошибка проверки дружбы');
            return;
        }

        if (existingFriend) {
            showNotification('Вы уже являетесь другом этого пользователя');
            return;
        }

        // Создаем связь дружбы
        const { error: createError } = await supabaseClient
            .from('user_friends')
            .insert([
                {
                    user_id: referrerId,
                    friend_id: user.id
                }
            ]);

        if (createError) {
            handleSupabaseError(createError, 'Ошибка добавления в друзья');
            return;
        }

        // Начисляем бонус пригласившему
        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({
                balance: supabase.sql`balance + ${Math.floor(user.balance * 0.1)}`
            })
            .eq('id', referrerId);

        if (updateError) {
            handleSupabaseError(updateError, 'Ошибка начисления бонуса');
            return;
        }

        showNotification('Вы успешно добавлены в список друзей!');
        
        // Обновляем список друзей
        updateFriendsList();
        
        // Удаляем параметр ref из URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
        handleSupabaseError(error, 'Ошибка обработки реферальной ссылки');
    }
}

// Показ уведомлений
function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Обработка ошибок Supabase
function handleSupabaseError(error, message) {
    console.error(message, error);
    showNotification(message, true);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    await initFriends();
    handleReferral();
});

// Инициализация списка друзей
async function initFriends() {
    const user = getCurrentUser();
    if (!user) return;

    // Отображаем имя пользователя
    const usernameElement = document.getElementById('yourUsername');
    if (usernameElement) {
        usernameElement.textContent = user.username;
    }

    // Загружаем список друзей
    await updateFriendsList();
}
