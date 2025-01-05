const SUPABASE_URL = 'https://hzsctjmzqjsgmjigshwd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6c2N0am16cWpzZ21qaWdzaHdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQ0MTc4OTIsImV4cCI6MjAxOTk5Mzg5Mn0.SSGqpvQQGkLmQB3VgqmP0VKKsHxZuTXeZfXxvLSWHBc';

// Создаем единственный экземпляр клиента Supabase
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
