// Конфигурация Supabase
const supabaseUrl = 'https://hzsctjmzqjsgmjigshwd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6c2N0am16cWpzZ21qaWdzaHdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYwMzg1MTYsImV4cCI6MjA1MTYxNDUxNn0.OVBvyWchb8yAi-xDAl5PTVks2YUD7DsYN3cVW-Gjuh4';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Глобальные переменные
let currentUser = null;

// Функции для работы с пользователем
function getCurrentUser() {
    if (!currentUser) {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            currentUser = JSON.parse(userData);
        }
    }
    return currentUser;
}

function setCurrentUser(user) {
    currentUser = user;
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
        localStorage.removeItem('currentUser');
    }
}
