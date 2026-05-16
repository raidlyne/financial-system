import React from 'react';
import { Card, Button, Space, Typography, Divider, Popconfirm, message } from 'antd';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { useNavigate } from 'react-router';

const { Title } = Typography;

const Profile: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleDelete = async () => {
        try {
            await authApi.deleteAccount();
            logout();
            message.success('Аккаунт удален');
            navigate('/sign-in');
        } catch (e) {
            message.error('Ошибка при удалении');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 50 }}>
            <Card title="Профиль пользователя" style={{ width: 500 }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                        <Title level={4}>Юзернейм:</Title>
                        <Title level={2}>{user}</Title>
                    </div>

                    <Divider />

                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Button type="primary" danger block onClick={() => navigate('/sign-in')}>
                            Выйти из аккаунта
                        </Button>

                        <Popconfirm
                            title="Удалить аккаунт?"
                            description="Это действие необратимо. Все ваши данные будут удалены."
                            onConfirm={handleDelete}
                            okText="Да, удалить"
                            cancelText="Отмена"
                        >
                            <Button danger block style={{ borderColor: '#ff4d4f', color: '#ff4d4f' }}>
                                Удалить аккаунт
                            </Button>
                        </Popconfirm>
                    </Space>
                </Space>
            </Card>
        </div>
    );
};

export default Profile;

