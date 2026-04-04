'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NotesPage() {
  const [notes, setNotes] = useState([]); // Состояние для данных
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchNotes = async () => {
      const token = localStorage.getItem('jwt_token');

      // 1. Проверка авторизации
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        // 2. Запрос к бэкенду
        const response = await fetch('http://localhost:8080/api/notes', {
          headers: {
            'Authorization': `Bearer ${token}`, // Передаем JWT
          },
        });

        if (response.status === 401) {
          router.push('/login');
          return;
        }

        if (!response.ok) throw new Error('Ошибка при загрузке данных');

        const data = await response.json();
        setNotes(data); // Кладем заметки из JSON в состояние
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [router]);

  if (loading) return <div className="p-8 text-center">Загрузка...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Список заметок</h1>
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="w-full text-left border-collapse bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 border-b font-semibold text-gray-700">Заголовок</th>
              <th className="px-6 py-3 border-b font-semibold text-gray-700">Содержание</th>
              <th className="px-6 py-3 border-b font-semibold text-gray-700">Дата создания</th>
              <th className="px-6 py-3 border-b font-semibold text-gray-700">Дата обновления</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {notes.map((note) => (
              <tr key={note.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{note.title}</td>
                <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{note.content}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(note.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
